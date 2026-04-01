import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";

export function makeRawCommand(): Command {
  const raw = new Command("raw")
    .description("Make a raw API request")
    .argument("<method>", "HTTP method (GET, POST, PUT, PATCH, DELETE)")
    .argument("<path>", "API path (e.g. /api/v2/models/people/1)")
    .option("--body <json>", "Request body as JSON string")
    .option("--profile <name>", "Profile to use")
    .action(async (method: string, path: string, opts: { body?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const upperMethod = method.toUpperCase();

      let result: unknown;
      switch (upperMethod) {
        case "GET":
          result = await client.get(path);
          break;
        case "POST":
          result = await client.post(path, opts.body ? JSON.parse(opts.body) : undefined);
          break;
        case "PUT":
          await client.put(path, opts.body ? JSON.parse(opts.body) : undefined);
          result = { success: true };
          break;
        case "PATCH":
          await client.patch(path, opts.body ? JSON.parse(opts.body) : undefined);
          result = { success: true };
          break;
        case "DELETE":
          await client.delete(path);
          result = { success: true };
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      output(result, { json: true });
    });

  return raw;
}
