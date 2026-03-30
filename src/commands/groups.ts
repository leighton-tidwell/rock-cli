import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { ODataQuery } from "../utils/odata.ts";

export function makeGroupsCommand(): Command {
  const groups = new Command("groups").description("Manage Rock groups");

  groups
    .command("list")
    .description("List groups with optional OData filters")
    .option("--type <groupTypeId>", "Filter by GroupTypeId")
    .option("--campus <campusId>", "Filter by CampusId")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { type?: string; campus?: string; top?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const query: ODataQuery = {};
      const filters: Record<string, unknown> = {};

      if (opts.type) {
        filters.GroupTypeId = Number(opts.type);
      }
      if (opts.campus) {
        filters.CampusId = Number(opts.campus);
      }
      if (Object.keys(filters).length > 0) {
        query.filter = filters;
      }
      if (opts.top) {
        query.top = Number(opts.top);
      }

      const result = await client.get("/api/Groups", Object.keys(query).length > 0 ? query : undefined);
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

      const query: ODataQuery = {};
      if (opts.attributes) {
        query.loadAttributes = "simple";
      }

      const result = await client.get(`/api/Groups/${id}`, Object.keys(query).length > 0 ? query : undefined);
      output(result, { json: true });
    });

  groups
    .command("members")
    .description("List members of a group")
    .argument("<id>", "Group ID")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const query: ODataQuery = {
        filter: `GroupId eq ${id}`,
        expand: ["Person"],
      };

      const result = await client.get("/api/GroupMembers", query);
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

      const result = await client.post("/api/GroupMembers", body);
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

      const query: ODataQuery = {
        filter: `GroupId eq ${groupId} and PersonId eq ${personId}`,
      };

      const members = await client.get<Array<{ Id: number }>>("/api/GroupMembers", query);

      if (!members || members.length === 0) {
        throw new Error(`No GroupMember found for GroupId=${groupId} and PersonId=${personId}`);
      }

      await client.delete(`/api/GroupMembers/${members[0]!.Id}`);
      output({ success: true, deletedId: members[0]!.Id }, { json: true });
    });

  return groups;
}
