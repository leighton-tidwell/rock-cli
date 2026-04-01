import { Command } from "commander";
import { resources, findResource } from "../registry.ts";
import { RockClient } from "../client.ts";
import type { SearchQuery } from "../utils/search.ts";
import { getActiveProfile } from "../config.ts";
import { output } from "../output.ts";

const NON_MODEL_RESOURCES = new Set([
  "BlockActions",
  "Chat",
  "CheckIn",
  "Controls",
  "LavaApp",
  "Tv",
  "Utilities",
]);

function parseBody(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON body: ${raw}`);
  }
}

function getFlags(cmd: Command): { json?: boolean; raw?: boolean; table?: boolean } {
  const root = cmd.parent ?? cmd;
  return root.opts();
}

function getGlobalOpts(cmd: Command): { profile?: string; dryRun?: boolean } {
  const root = cmd.parent ?? cmd;
  return root.opts();
}

function validateResource(name: string): { name: string; path: string; category: string; description: string } {
  if (NON_MODEL_RESOURCES.has(name)) {
    console.error(
      `Error: "${name}" is a non-model resource and does not support standard CRUD operations.\n` +
      `Use 'rock raw' to make direct HTTP requests to this endpoint instead.`
    );
    process.exit(1);
  }

  const entry = findResource(name);
  if (!entry) {
    console.error(
      `Error: Unknown resource "${name}".\n` +
      `Run 'rock resource list' to see all available resources.`
    );
    process.exit(1);
  }

  return entry;
}

export function makeResourceCommand(): Command {
  const resource = new Command("resource")
    .description("Interact with Rock RMS v2 model resources");

  // ── list ─────────────────────────────────────────────────────────
  resource
    .command("list")
    .description("List all available resources")
    .option("--category <cat>", "Filter by category")
    .action((opts: { category?: string }) => {
      const grouped = new Map<string, typeof resources[number][]>();

      for (const r of resources) {
        if (opts.category && r.category.toLowerCase() !== opts.category.toLowerCase()) {
          continue;
        }
        const list = grouped.get(r.category) ?? [];
        list.push(r);
        grouped.set(r.category, list);
      }

      if (grouped.size === 0) {
        console.log(opts.category
          ? `No resources found in category "${opts.category}".`
          : "No resources found.");
        return;
      }

      const sortedCategories = [...grouped.keys()].sort();
      for (const cat of sortedCategories) {
        const items = grouped.get(cat)!;
        console.log(`\n  ${cat}`);
        console.log(`  ${"─".repeat(cat.length)}`);
        for (const item of items) {
          const desc = item.description ? `  ${item.description}` : "";
          console.log(`    ${item.name.padEnd(30)} ${item.path}${desc}`);
        }
      }
      console.log();
    });

  // ── search ───────────────────────────────────────────────────────
  resource
    .command("search <name>")
    .description("Search/list records for a resource")
    .option("--where <linq>", "Dynamic LINQ filter expression")
    .option("--select <linq>", "Projection expression")
    .option("--sort <expr>", "Sort expression")
    .option("--take <n>", "Limit results", parseInt)
    .option("--offset <n>", "Skip results", parseInt)
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const flags = getFlags(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      const query: SearchQuery = {};
      if (opts.where) query.where = opts.where as string;
      if (opts.select) query.select = opts.select as string;
      if (opts.sort) query.sort = opts.sort as string;
      if (opts.take !== undefined) query.take = opts.take as number;
      if (opts.offset !== undefined) query.offset = opts.offset as number;

      const result = await client.search(entry.path, query);
      output(result, flags);
    });

  // ── get ──────────────────────────────────────────────────────────
  resource
    .command("get <name> <id>")
    .description("Get a single record by ID")
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, id: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const flags = getFlags(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      const result = await client.getOne(entry.path, id);
      output(result, flags);
    });

  // ── create ───────────────────────────────────────────────────────
  resource
    .command("create <name>")
    .description("Create a new record")
    .requiredOption("--body <json>", "JSON body for the record")
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const flags = getFlags(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      const body = parseBody(opts.body as string);
      const result = await client.create(entry.path, body);
      output(result, flags);
    });

  // ── update ───────────────────────────────────────────────────────
  resource
    .command("update <name> <id>")
    .description("Update a record by ID")
    .requiredOption("--body <json>", "JSON body with fields to update")
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, id: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      const body = parseBody(opts.body as string);
      await client.update(entry.path, id, body);
      console.log(`Updated ${entry.name} #${id}`);
    });

  // ── delete ───────────────────────────────────────────────────────
  resource
    .command("delete <name> <id>")
    .description("Delete a record by ID")
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, id: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      await client.remove(entry.path, id);
      console.log(`Deleted ${entry.name} #${id}`);
    });

  // ── attributes ───────────────────────────────────────────────────
  resource
    .command("attributes <name> <id>")
    .description("Get attribute values for a record")
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, id: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const flags = getFlags(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      const result = await client.getAttributes(entry.path, id);
      output(result, flags);
    });

  // ── set-attributes ───────────────────────────────────────────────
  resource
    .command("set-attributes <name> <id>")
    .description("Update attribute values for a record")
    .requiredOption("--body <json>", "JSON body with attribute key/value pairs")
    .option("--profile <name>", "Profile to use")
    .action(async (name: string, id: string, opts: Record<string, unknown>, cmd: Command) => {
      const entry = validateResource(name);
      const global = getGlobalOpts(cmd);
      const profile = getActiveProfile((opts.profile as string) ?? (global.profile as string));
      const client = new RockClient(profile);
      if (global.dryRun) client.dryRun = true;

      const body = parseBody(opts.body as string);
      await client.updateAttributes(entry.path, id, body);
      console.log(`Updated attributes for ${entry.name} #${id}`);
    });

  return resource;
}
