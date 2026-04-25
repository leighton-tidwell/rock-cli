# Files Command Reference

Browse and modify the Rock server filesystem (`Plugins`, `Themes`, `Content`, `App_Data`) via the [Triumph Tech Magnus](https://github.com/Triumph-Tech/magnus-vscode) REST endpoints. The Magnus plugin must be installed on the target Rock instance — same plugin that powers `rock sql`.

**Related**: [sql.md](sql.md), [troubleshooting.md](troubleshooting.md).

## Prerequisite: Enable Magnus per profile

The `files` command shares the same gate as `sql`. Edit `~/.rockrc.json`:

```json
{
  "profiles": {
    "default": {
      "url": "https://rock.example.com",
      "apiKey": "...",
      "magnus": true
    }
  },
  "activeProfile": "default"
}
```

If `magnus` is missing or `false`, `rock files ...` exits non-zero with the same friendly error as `rock sql`.

## What it can reach

The `serverfs` root exposes the Rock-modifiable subset of `wwwroot`:

| Path        | Typical use |
|-------------|-------------|
| `/Plugins`  | Custom blocks (`com_northrock/`), third-party plugins |
| `/Themes`   | Site themes / layouts |
| `/Content`  | Uploaded media, content channel assets |
| `/App_Data` | Server-side data (rarely edited directly) |

It does **not** expose:
- Arbitrary `wwwroot` paths (`web.config`, `bin/`, `App_Code/`, root `.aspx` files)
- DLLs in `bin/` (still requires a Triumph deploy)
- The full filesystem outside `wwwroot`

For everything in scope, prefer this CLI over `Rock Admin > File Manager` when scripting or doing bulk operations (e.g. syncing `Plugins/com_northrock/` from a local repo).

## Commands

| Command | Description |
|---------|-------------|
| `rock files ls [path]` | List a directory (default: root) |
| `rock files cat <path>` | Read a file and print to stdout |
| `rock files get <remote> [local]` | Download a file to disk |
| `rock files put <local> <remote>` | Upload a file (creates or overwrites) |
| `rock files write <remote>` | Overwrite an existing file with stdin (file must exist) |
| `rock files rm <path>` | Delete a file or folder |
| `rock files mkdir <path>` | Create a folder |
| `rock files url <path> --op <op>` | Print the absolute Magnus API URL (debug) |

All commands accept `--profile <name>`.

## files ls

```bash
rock files ls /              # roots: App_Data, Content, Plugins, Themes
rock files ls /Plugins
rock files ls /Plugins/com_northrock
rock files ls /Plugins --json   # raw ItemDescriptor[] (PascalCase wire format)
```

Default output is a two-column table (`name`, `path`). Folders are suffixed with `/`. Hidden / OS files are filtered by the server.

## files cat / get

```bash
rock files cat /Plugins/readme.txt
rock files get /Plugins/com_northrock/foo.obs.js                  # writes ./foo.obs.js
rock files get /Plugins/com_northrock/foo.obs.js ./local-foo.obs.js
```

`cat` writes raw bytes to stdout — pipe to `xxd`, `wc -c`, etc. for binary files.

## files put

Multipart upload. Creates the file if missing, overwrites if present.

```bash
# Upload to an explicit path
rock files put ./local.css /Themes/NorthRock/Styles/custom.css

# Upload into a directory (keeps local basename)
rock files put ./custom.css /Themes/NorthRock/Styles/
```

`put` is the right command for new files. `write` (POST FileContent with `application/octet-stream`) only works on files that already exist — the server returns **409** otherwise. The CLI uses `put`'s multipart path internally to avoid that footgun.

## files write

Overwrite an existing file with stdin. Useful in pipelines:

```bash
echo 'h1 { color: red; }' | rock files write /Themes/NorthRock/Styles/custom.css
cat ./build/output.obs.js | rock files write /Plugins/com_northrock/foo.obs.js
```

Will fail with `Rock API error: 409` if the target does not exist — use `put` to create.

## files rm

```bash
rock files rm /Plugins/com_northrock/old.obs.js
rock files rm /Content/scratch-dir          # works on folders too
```

The CLI sends `Content-Length: 0` because IIS rejects body-less DELETEs with HTTP 411 — a manual `curl -X DELETE` will fail unless you do the same.

## files mkdir

```bash
rock files mkdir /Plugins/com_northrock/Assets
```

Single-level only. To make nested folders, call `mkdir` for each level.

## files url

Debug helper — prints the absolute Magnus API URL the CLI would hit:

```bash
rock files url /Plugins/readme.txt --op content   # FileContent endpoint
rock files url /Plugins                  --op list      # GetTreeItems
rock files url /Plugins/foo.txt          --op delete    # Delete
rock files url /Plugins/foo.txt          --op upload    # UploadFile (parent dir)
rock files url /Plugins/NewDir           --op mkdir     # NewFolder (parent dir)
```

Handy when you want to hit the endpoint with `curl` directly or share a repro link.

## Common patterns

### Sync a local plugin folder into Rock

```bash
# Mirror ./com_northrock/Assets/*.obs.js into Rock
for f in ./com_northrock/Assets/*.obs.js; do
  rock files put "$f" /Plugins/com_northrock/Assets/
done
```

### Pull down all Lava in a theme

```bash
rock files ls /Themes/NorthRock/Layouts --json \
  | jq -r '.[] | select(.IsFolder == false) | .CopyValue' \
  | while read p; do
      rock files get "$p" "./theme-backup/$(basename "$p")"
    done
```

### Diff a remote file against a local copy

```bash
diff <(rock files cat /Themes/NorthRock/Styles/custom.css) ./custom.css
```

### Back up a block before editing

```bash
ts=$(date +%Y%m%d-%H%M%S)
rock files get /Plugins/com_northrock/foo.obs.js "./backups/foo.obs.js.$ts"
```

## Wire-format notes

- All endpoints sit under `/api/TriumphTech/Magnus/*` and accept the `authorization-token` header (the same Rock API key used everywhere else in `rock-cli` — no separate cookie/login).
- `GET .../GetTreeItems/serverfs/directory-list/<path>` returns `ItemDescriptor[]`. Each item carries the URIs the server wants you to use for further actions (`Uri`, `UploadFileUri`, `DeleteUri`, etc.). The CLI mostly synthesizes paths directly because the URI shape is stable, but `--op` in `files url` reflects the same construction.
- `POST .../UploadFile/serverfs/<parent>` is multipart with field name `files`; this is the only path that creates new files.
- `POST .../FileContent/serverfs/<path>` with `Content-Type: application/octet-stream` overwrites — but **only** if the file exists. New paths return **409**.
- `POST .../NewFolder/serverfs/<parent>` body is the new folder name as `text/plain`.
- `DELETE .../Delete/serverfs/<path>` requires explicit `Content-Length: 0`.

## Error handling

- `403 Forbidden` — API key valid but lacks rights to that path. Magnus enforces the same security model as Rock REST.
- `404 Not Found` — wrong path, or trying to `cat` something that was just deleted.
- `409 Conflict` from `write` — the file does not exist; use `put` instead.
- `411 Length Required` from `rm` via raw `curl` — pass `-H 'Content-Length: 0'` (the CLI does this for you).

If you see `401 Unauthorized` against a profile where Magnus is enabled, the API key is missing REST access — Magnus uses the same Rock authorization as everything else in the CLI.
