import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { SearchQuery } from "../utils/search.ts";

export function makeGroupsCommand(): Command {
  const groups = new Command("groups").description("Manage Rock groups");

  groups
    .command("list")
    .description("List groups with optional filters")
    .option("--type <groupTypeId>", "Filter by GroupTypeId")
    .option("--campus <campusId>", "Filter by CampusId")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { type?: string; campus?: string; top?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const conditions: string[] = [];
      if (opts.type) {
        conditions.push(`GroupTypeId == ${opts.type}`);
      }
      if (opts.campus) {
        conditions.push(`CampusId == ${opts.campus}`);
      }

      const query: SearchQuery = {};
      if (conditions.length > 0) {
        query.where = conditions.join(" && ");
      }
      if (opts.top) {
        query.take = parseInt(opts.top, 10);
      }

      const result = await client.search("groups", query);
      output(result, { json: true });
    });

  groups
    .command("get")
    .description("Get a group by ID")
    .argument("<id>", "Group ID")
    .option("--attributes", "Load attributes")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { attributes?: boolean; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const group = await client.getOne("groups", id);

      if (opts.attributes) {
        const attrs = await client.getAttributes("groups", id);
        output({ ...group as Record<string, unknown>, Attributes: attrs }, { json: true });
      } else {
        output(group, { json: true });
      }
    });

  groups
    .command("members")
    .description("List members of a group")
    .argument("<id>", "Group ID")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const result = await client.search("groupmembers", {
        where: `GroupId == ${id}`,
      });
      output(result, { json: true });
    });

  groups
    .command("add-member")
    .description("Add a member to a group")
    .argument("<groupId>", "Group ID")
    .argument("<personId>", "Person ID")
    .option("--role <roleId>", "Group role ID", "2")
    .option("--profile <name>", "Profile to use")
    .action(async (groupId: string, personId: string, opts: { role: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const body = {
        GroupId: Number(groupId),
        PersonId: Number(personId),
        GroupRoleId: Number(opts.role),
        GroupMemberStatus: 1,
      };

      const result = await client.create("groupmembers", body);
      output(result, { json: true });
    });

  groups
    .command("remove-member")
    .description("Remove a member from a group")
    .argument("<groupId>", "Group ID")
    .argument("<personId>", "Person ID")
    .option("--profile <name>", "Profile to use")
    .action(async (groupId: string, personId: string, opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const result = await client.search<{ Id: number }>("groupmembers", {
        where: `GroupId == ${groupId} && PersonId == ${personId}`,
      });

      if (!result.items || result.items.length === 0) {
        throw new Error(`No GroupMember found for GroupId=${groupId} and PersonId=${personId}`);
      }

      await client.remove("groupmembers", result.items[0]!.Id);
      output({ success: true, deletedId: result.items[0]!.Id }, { json: true });
    });

  return groups;
}
