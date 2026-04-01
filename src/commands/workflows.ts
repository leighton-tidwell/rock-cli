import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { SearchQuery } from "../utils/search.ts";

export function makeWorkflowsCommand(): Command {
  const workflows = new Command("workflows")
    .description("Manage Rock workflows");

  workflows
    .command("list")
    .description("List workflow types or workflow instances")
    .option("--type <t>", "Resource type: types or workflows", "types")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { type: string; top?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const resource = opts.type === "workflows" ? "workflows" : "workflowtypes";
      const query: SearchQuery = {};
      if (opts.top) {
        query.take = parseInt(opts.top, 10);
      }

      const result = await client.search(resource, query);
      output(result, { json: true });
    });

  workflows
    .command("launch")
    .description("Launch a workflow by type ID")
    .argument("<typeId>", "Workflow type ID")
    .option("--attrs <json>", "Attributes as JSON string")
    .option("--profile <name>", "Profile to use")
    .action(async (typeId: string, opts: { attrs?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const body = opts.attrs ? JSON.parse(opts.attrs) : {};
      const result = await client.post(`/api/LaunchWorkflow/${typeId}`, body);
      output(result, { json: true });
    });

  workflows
    .command("status")
    .description("Get workflow status by ID")
    .argument("<id>", "Workflow ID")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const result = await client.getOne("workflows", id);
      output(result, { json: true });
    });

  return workflows;
}
