import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";

export function makeCampusesCommand(): Command {
  const campuses = new Command("campuses").description("Manage campuses");

  campuses
    .command("list")
    .description("List all campuses")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const result = await client.get("/Campuses");
      output(result, { json: true });
    });

  campuses
    .command("get")
    .description("Get a campus by ID")
    .argument("<id>", "Campus ID")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const result = await client.get(`/Campuses/${id}`);
      output(result, { json: true });
    });

  return campuses;
}
