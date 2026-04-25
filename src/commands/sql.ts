import { Command } from "commander";
import { getActiveProfile, loadConfig, type RockProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";

// ---------------------------------------------------------------------------
// Magnus protocol types (PascalCase wire format)
// ---------------------------------------------------------------------------

interface ConnectResponse {
  DatabaseName: string;
  OSVersion: string;
  RockVersion: string;
  SqlEdition: string;
  SqlVersion: string;
}

interface QueryColumn {
  Name: string;
  Type: number;
}

interface QueryResultSet {
  Columns: QueryColumn[];
  Rows: unknown[][];
}

interface QueryMessage {
  Message: string;
  Code?: number | null;
  Level?: number | null;
  State?: number | null;
  LineNumber?: number | null;
}

interface ExecuteQueryProgress {
  Identifier: string;
  IsComplete: boolean;
  Duration: number;
  Messages: QueryMessage[];
  ResultSets?: QueryResultSet[] | null;
}

interface ObjectExplorerNode {
  Id: string;
  Type: number;
  Name: string;
}

interface ObjectExplorerNodesResponse {
  Nodes: ObjectExplorerNode[];
}

const NODE_TYPE_TABLES_FOLDER = 2;
const NODE_TYPE_TABLE = 3;

// ---------------------------------------------------------------------------
// Magnus gate
// ---------------------------------------------------------------------------

interface ResolvedProfile {
  name: string;
  profile: RockProfile;
}

function resolveAndGate(profileOverride?: string): ResolvedProfile {
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

  return { name: name!, profile };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function printResultSetTable(rs: QueryResultSet): void {
  const headers = rs.Columns.map((c) => c.Name);
  if (headers.length === 0) {
    process.stdout.write("(no columns)\n");
    return;
  }
  const widths = headers.map((h, colIdx) =>
    Math.max(h.length, ...rs.Rows.map((r) => formatCell(r[colIdx]).length))
  );
  const headerLine = headers.map((h, i) => h.padEnd(widths[i]!)).join("  ");
  const sepLine = widths.map((w) => "-".repeat(w)).join("  ");
  process.stdout.write(headerLine + "\n");
  process.stdout.write(sepLine + "\n");
  for (const row of rs.Rows) {
    const line = row
      .map((cell, i) => formatCell(cell).padEnd(widths[i]!))
      .join("  ");
    process.stdout.write(line + "\n");
  }
  process.stdout.write(`(${rs.Rows.length} row${rs.Rows.length === 1 ? "" : "s"})\n`);
}

function printQueryResult(progress: ExecuteQueryProgress, jsonMode: boolean): void {
  if (jsonMode) {
    output(progress, { json: true });
    return;
  }
  for (const m of progress.Messages ?? []) {
    process.stdout.write(m.Message.endsWith("\n") ? m.Message : m.Message + "\n");
  }
  const sets = progress.ResultSets ?? [];
  for (let i = 0; i < sets.length; i++) {
    if (i > 0) process.stdout.write("\n");
    printResultSetTable(sets[i]!);
  }
  process.stdout.write(`\n(${progress.Duration}ms)\n`);
}

// ---------------------------------------------------------------------------
// Command factory
// ---------------------------------------------------------------------------

export function makeSqlCommand(): Command {
  const sql = new Command("sql").description(
    "Run SQL against a Rock instance via the Triumph Tech Magnus REST endpoints"
  );

  // ---------------- query ----------------
  sql
    .command("query")
    .description("Execute a SQL query and print the result set")
    .argument("[sql]", "SQL to run; pass '-' or omit with stdin piped to read from stdin")
    .option("--json", "Output the raw ExecuteQueryProgress JSON")
    .option("--timeout <seconds>", "Max wait before cancelling (default 60)")
    .option("--poll-interval <ms>", "Poll interval in milliseconds (default 500)")
    .option("--profile <name>", "Profile to use")
    .action(
      async (
        sqlArg: string | undefined,
        opts: {
          json?: boolean;
          timeout?: string;
          pollInterval?: string;
          profile?: string;
        }
      ) => {
        const { profile } = resolveAndGate(opts.profile);
        const client = new RockClient(profile);

        let queryText: string;
        if (!sqlArg || sqlArg === "-") {
          queryText = (await readStdin()).trim();
        } else {
          queryText = sqlArg;
        }
        if (!queryText) {
          throw new Error("No SQL provided (positional arg or stdin required).");
        }

        const timeoutMs = (parseInt(opts.timeout ?? "60", 10) || 60) * 1000;
        const pollInterval = parseInt(opts.pollInterval ?? "500", 10) || 500;

        const start = Date.now();
        let progress = await client.post<ExecuteQueryProgress>(
          "/api/TriumphTech/Magnus/Sql/ExecuteQuery",
          { query: queryText }
        );

        while (!progress.IsComplete) {
          if (Date.now() - start > timeoutMs) {
            await client
              .delete(`/api/TriumphTech/Magnus/Sql/Cancel/${progress.Identifier}`)
              .catch(() => undefined);
            throw new Error(
              `Query timed out after ${timeoutMs}ms; cancel issued. Identifier: ${progress.Identifier}`
            );
          }
          await sleep(pollInterval);
          progress = await client.get<ExecuteQueryProgress>(
            `/api/TriumphTech/Magnus/Sql/Status/${progress.Identifier}`
          );
        }

        printQueryResult(progress, !!opts.json);
      }
    );

  // ---------------- info ----------------
  sql
    .command("info")
    .description("Print server metadata (Rock version, SQL edition, database name)")
    .option("--json", "Output as JSON")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { json?: boolean; profile?: string }) => {
      const { profile } = resolveAndGate(opts.profile);
      const client = new RockClient(profile);
      const result = await client.post<ConnectResponse>(
        "/api/TriumphTech/Magnus/Sql/Connect",
        {}
      );
      if (opts.json) {
        output(result, { json: true });
        return;
      }
      output(
        {
          rockVersion: result.RockVersion,
          sqlEdition: result.SqlEdition,
          sqlVersion: result.SqlVersion,
          databaseName: result.DatabaseName,
          osVersion: result.OSVersion,
        },
        { table: true }
      );
    });

  // ---------------- tables ----------------
  sql
    .command("tables")
    .description("List tables in the database")
    .option("--json", "Output as JSON")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { json?: boolean; profile?: string }) => {
      const { profile } = resolveAndGate(opts.profile);
      const client = new RockClient(profile);

      // Walk: root -> first DB / TablesFolder -> tables
      const root = await client.post<ObjectExplorerNodesResponse>(
        "/api/TriumphTech/Magnus/Sql/ObjectExplorerNodes",
        {}
      );

      // Find a TablesFolder anywhere in the first level. If not present,
      // descend one more level (root may give DB nodes).
      let tablesFolderId: string | undefined;
      for (const node of root.Nodes) {
        if (node.Type === NODE_TYPE_TABLES_FOLDER) {
          tablesFolderId = node.Id;
          break;
        }
      }
      if (!tablesFolderId) {
        // Try drilling into the first node.
        const first = root.Nodes[0];
        if (first) {
          const drill = await client.post<ObjectExplorerNodesResponse>(
            "/api/TriumphTech/Magnus/Sql/ObjectExplorerNodes",
            { nodeId: first.Id }
          );
          for (const node of drill.Nodes) {
            if (node.Type === NODE_TYPE_TABLES_FOLDER) {
              tablesFolderId = node.Id;
              break;
            }
          }
        }
      }

      let tables: ObjectExplorerNode[] = [];
      if (tablesFolderId) {
        const expanded = await client.post<ObjectExplorerNodesResponse>(
          "/api/TriumphTech/Magnus/Sql/ObjectExplorerNodes",
          { nodeId: tablesFolderId }
        );
        tables = expanded.Nodes.filter((n) => n.Type === NODE_TYPE_TABLE);
      } else {
        // Fallback: surface whatever the root returned
        tables = root.Nodes;
      }

      if (opts.json) {
        output(tables, { json: true });
        return;
      }
      const rows = tables.map((t) => ({ name: t.Name }));
      output(rows, { table: true });
    });

  return sql;
}
