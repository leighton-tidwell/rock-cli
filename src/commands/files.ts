import { Command } from "commander";
import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { getActiveProfile, loadConfig, type RockProfile } from "../config.ts";
import { output } from "../output.ts";

// ---------------------------------------------------------------------------
// Magnus VS Code protocol types (PascalCase wire format)
//
// All endpoints under /api/TriumphTech/Magnus/* on the Rock instance.
// Auth: same Rock API key the rest of rock-cli uses (authorization-token header).
// ---------------------------------------------------------------------------

interface ItemDescriptor {
  DisplayName: string;
  Uri: string;
  IsFolder: boolean;
  RemoteViewUri: string;
  RemoteEditUri: string;
  DisableOpenFile: boolean;
  BuildUri: string;
  UploadFileUri: string;
  NewFileUri: string;
  NewFolderUri: string;
  UploadFolderUri: string;
  DeleteUri: string;
  CopyValue: string;
  Id: string;
  Guid: string;
  Icon: string;
  IconDark: string;
}

interface ActionResponse {
  ResponseMessage: string;
  IsAsynchronous: boolean;
  ActionSuccessful: boolean;
}

const ROOT = "serverfs";

// ---------------------------------------------------------------------------
// Profile resolution / Magnus gate (mirrors sql.ts)
// ---------------------------------------------------------------------------

function resolveAndGate(profileOverride?: string): RockProfile {
  const profile = getActiveProfile(profileOverride);
  let name = profileOverride;
  if (!name) {
    try {
      name = loadConfig().activeProfile;
    } catch {
      name = "default";
    }
  }
  if (!profile.magnus) {
    process.stderr.write(
      `Magnus is not enabled for profile '${name}'. The Magnus plugin must be ` +
        `installed on this Rock instance. Set "magnus": true on the profile in ` +
        `~/.rockrc.json once confirmed.\n`
    );
    process.exit(1);
  }
  return profile;
}

// ---------------------------------------------------------------------------
// Path / URL helpers
// ---------------------------------------------------------------------------

function normalizeRemotePath(path: string): string {
  // Allow "/Plugins/foo.txt", "Plugins/foo.txt", or "Plugins\\foo.txt"
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function parentAndName(path: string): { parent: string; name: string } {
  const norm = normalizeRemotePath(path);
  const idx = norm.lastIndexOf("/");
  if (idx === -1) return { parent: "", name: norm };
  return { parent: norm.slice(0, idx), name: norm.slice(idx + 1) };
}

function buildUrl(profile: RockProfile, apiPath: string): string {
  const base = profile.url.replace(/\/+$/, "");
  return `${base}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
}

function toAbsoluteUrl(profile: RockProfile, uriOrPath: string): string {
  if (uriOrPath.includes("://")) return uriOrPath;
  return buildUrl(profile, uriOrPath);
}

// ---------------------------------------------------------------------------
// Low-level fetch helpers — bypasses RockClient because we need raw bytes,
// multipart bodies, and explicit Content-Length: 0 for DELETE (IIS rejects
// otherwise with HTTP 411).
// ---------------------------------------------------------------------------

function authHeaders(profile: RockProfile): Record<string, string> {
  return { "authorization-token": profile.apiKey };
}

async function rockFetch(
  profile: RockProfile,
  method: string,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = { ...authHeaders(profile), ...(init.headers as Record<string, string> | undefined) };
  const response = await fetch(url, { ...init, method, headers });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Rock API error: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 500)}` : ""}`
    );
  }
  return response;
}

async function getJson<T>(profile: RockProfile, apiPath: string): Promise<T> {
  const res = await rockFetch(profile, "GET", buildUrl(profile, apiPath));
  return (await res.json()) as T;
}

async function getBytes(profile: RockProfile, url: string): Promise<Uint8Array> {
  const res = await rockFetch(profile, "GET", url);
  return new Uint8Array(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// API operations
// ---------------------------------------------------------------------------

function listUrl(remotePath: string): string {
  const norm = normalizeRemotePath(remotePath);
  return norm
    ? `/api/TriumphTech/Magnus/GetTreeItems/${ROOT}/directory-list/${norm}`
    : `/api/TriumphTech/Magnus/GetTreeItems/${ROOT}/`;
}

function fileContentUrl(remotePath: string): string {
  return `/api/TriumphTech/Magnus/FileContent/${ROOT}/${normalizeRemotePath(remotePath)}`;
}

function deleteUrl(remotePath: string): string {
  return `/api/TriumphTech/Magnus/Delete/${ROOT}/${normalizeRemotePath(remotePath)}`;
}

function uploadFileUrl(parent: string): string {
  const p = normalizeRemotePath(parent);
  return p
    ? `/api/TriumphTech/Magnus/UploadFile/${ROOT}/${p}`
    : `/api/TriumphTech/Magnus/UploadFile/${ROOT}`;
}

function newFolderUrl(parent: string): string {
  const p = normalizeRemotePath(parent);
  return p
    ? `/api/TriumphTech/Magnus/NewFolder/${ROOT}/${p}`
    : `/api/TriumphTech/Magnus/NewFolder/${ROOT}`;
}

async function listDirectory(profile: RockProfile, remotePath: string): Promise<ItemDescriptor[]> {
  return getJson<ItemDescriptor[]>(profile, listUrl(remotePath));
}

async function readFile(profile: RockProfile, remotePath: string): Promise<Uint8Array> {
  return getBytes(profile, buildUrl(profile, fileContentUrl(remotePath)));
}

async function uploadFile(
  profile: RockProfile,
  parent: string,
  filename: string,
  content: Uint8Array
): Promise<ActionResponse> {
  const form = new FormData();
  form.append("files", new Blob([content as BlobPart]), filename);
  const res = await rockFetch(profile, "POST", buildUrl(profile, uploadFileUrl(parent)), {
    body: form,
  });
  return (await res.json()) as ActionResponse;
}

async function overwriteFile(
  profile: RockProfile,
  remotePath: string,
  content: Uint8Array
): Promise<void> {
  await rockFetch(profile, "POST", buildUrl(profile, fileContentUrl(remotePath)), {
    body: content as BodyInit,
    headers: { "Content-Type": "application/octet-stream" },
  });
}

async function deleteRemote(
  profile: RockProfile,
  remotePath: string
): Promise<ActionResponse> {
  // IIS returns 411 unless Content-Length: 0 is explicit on a body-less DELETE.
  const res = await rockFetch(profile, "DELETE", buildUrl(profile, deleteUrl(remotePath)), {
    headers: { "Content-Length": "0" },
  });
  return (await res.json()) as ActionResponse;
}

async function makeDirectory(
  profile: RockProfile,
  parent: string,
  name: string
): Promise<ActionResponse> {
  const res = await rockFetch(profile, "POST", buildUrl(profile, newFolderUrl(parent)), {
    body: name,
    headers: { "Content-Type": "text/plain" },
  });
  return (await res.json()) as ActionResponse;
}

// ---------------------------------------------------------------------------
// Command surface
// ---------------------------------------------------------------------------

export function makeFilesCommand(): Command {
  const files = new Command("files").description(
    "Browse and modify the Rock server filesystem via the Triumph Tech Magnus REST endpoints"
  );

  // ---------------- ls ----------------
  files
    .command("ls")
    .description("List a directory on the Rock server (root: '/Plugins', '/Themes', '/Content', '/App_Data')")
    .argument("[path]", "Remote path", "/")
    .option("--json", "Output as JSON")
    .option("--raw", "Output as compact JSON")
    .option("--profile <name>", "Profile to use")
    .action(async (path: string, opts: { json?: boolean; raw?: boolean; profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const items = await listDirectory(profile, path);
      if (opts.json || opts.raw) {
        output(items, { json: opts.json, raw: opts.raw });
        return;
      }
      const rows = items.map((i) => ({
        name: i.DisplayName + (i.IsFolder ? "/" : ""),
        path: i.CopyValue || "",
      }));
      output(rows, { table: true });
    });

  // ---------------- cat ----------------
  files
    .command("cat")
    .description("Read a remote file and print to stdout")
    .argument("<path>", "Remote file path")
    .option("--profile <name>", "Profile to use")
    .action(async (path: string, opts: { profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const bytes = await readFile(profile, path);
      process.stdout.write(bytes);
    });

  // ---------------- get ----------------
  files
    .command("get")
    .description("Download a remote file to the local filesystem")
    .argument("<remote>", "Remote file path")
    .argument("[local]", "Local destination (defaults to basename in cwd)")
    .option("--profile <name>", "Profile to use")
    .action(async (remote: string, local: string | undefined, opts: { profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const bytes = await readFile(profile, remote);
      const dest = local || basename(normalizeRemotePath(remote));
      writeFileSync(dest, bytes);
      process.stderr.write(`Wrote ${bytes.length} bytes -> ${dest}\n`);
    });

  // ---------------- put ----------------
  files
    .command("put")
    .description("Upload a local file to a remote path (creates or overwrites)")
    .argument("<local>", "Local source file")
    .argument("<remote>", "Remote destination path or directory")
    .option("--profile <name>", "Profile to use")
    .action(async (local: string, remote: string, opts: { profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const content = readFileSync(local);
      const bytes = new Uint8Array(content);

      // If <remote> ends with "/", treat it as a directory and keep local basename.
      let parent: string;
      let name: string;
      if (remote.endsWith("/") || remote === "" || remote === "/") {
        parent = remote;
        name = basename(local);
      } else {
        const parts = parentAndName(remote);
        parent = parts.parent;
        name = parts.name;
      }

      // Strategy: try multipart UploadFile (creates new or overwrites).
      // UploadFile is the only path that works for new files; POST FileContent
      // returns 409 on a non-existent target.
      const result = await uploadFile(profile, parent, name, bytes);
      if (!result.ActionSuccessful) {
        throw new Error(
          `Upload failed: ${result.ResponseMessage || "(no message from server)"}`
        );
      }
      process.stderr.write(
        `Uploaded ${bytes.length} bytes -> /${normalizeRemotePath(parent)}/${name}\n`
      );
    });

  // ---------------- write (overwrite-only via FileContent) ----------------
  files
    .command("write")
    .description(
      "Overwrite an existing remote file with raw bytes from stdin (file must already exist)"
    )
    .argument("<remote>", "Remote file path (must exist)")
    .option("--profile <name>", "Profile to use")
    .action(async (remote: string, opts: { profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
      }
      const buf = Buffer.concat(chunks);
      await overwriteFile(profile, remote, new Uint8Array(buf));
      process.stderr.write(`Overwrote ${buf.length} bytes at /${normalizeRemotePath(remote)}\n`);
    });

  // ---------------- rm ----------------
  files
    .command("rm")
    .description("Delete a remote file or folder")
    .argument("<path>", "Remote path")
    .option("--profile <name>", "Profile to use")
    .action(async (path: string, opts: { profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const result = await deleteRemote(profile, path);
      if (!result.ActionSuccessful) {
        throw new Error(
          `Delete failed: ${result.ResponseMessage || "(no message from server)"}`
        );
      }
      process.stderr.write(`Deleted /${normalizeRemotePath(path)}\n`);
    });

  // ---------------- mkdir ----------------
  files
    .command("mkdir")
    .description("Create a new remote folder")
    .argument("<path>", "Remote path of the new folder")
    .option("--profile <name>", "Profile to use")
    .action(async (path: string, opts: { profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const { parent, name } = parentAndName(path);
      if (!name) throw new Error("mkdir requires a folder name");
      const result = await makeDirectory(profile, parent, name);
      if (!result.ActionSuccessful) {
        throw new Error(
          `mkdir failed: ${result.ResponseMessage || "(no message from server)"}`
        );
      }
      process.stderr.write(`Created /${normalizeRemotePath(path)}/\n`);
    });

  // ---------------- url ----------------
  files
    .command("url")
    .description("Print the absolute Magnus API URL for a remote path (debug helper)")
    .argument("<path>", "Remote path")
    .option("--op <op>", "Operation: list | content | delete | upload | mkdir", "content")
    .option("--profile <name>", "Profile to use")
    .action((path: string, opts: { op: string; profile?: string }) => {
      const profile = resolveAndGate(opts.profile);
      const map: Record<string, () => string> = {
        list: () => listUrl(path),
        content: () => fileContentUrl(path),
        delete: () => deleteUrl(path),
        upload: () => uploadFileUrl(parentAndName(path).parent),
        mkdir: () => newFolderUrl(parentAndName(path).parent),
      };
      const fn = map[opts.op];
      if (!fn) throw new Error(`Unknown --op '${opts.op}'`);
      process.stdout.write(toAbsoluteUrl(profile, fn()) + "\n");
    });

  return files;
}
