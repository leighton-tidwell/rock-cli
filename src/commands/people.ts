import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { SearchQuery } from "../utils/search.ts";

export function makePeopleCommand(): Command {
  const people = new Command("people").description("Manage people in Rock RMS");

  people
    .command("search")
    .description("Search for people")
    .option("--email <email>", "Filter by email")
    .option("--name <name>", "Filter by last name or nickname")
    .option("--phone <phone>", "Filter by phone number prefix")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { email?: string; name?: string; phone?: string; top?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const conditions: string[] = [];
      if (opts.email) {
        conditions.push(`Email == "${opts.email}"`);
      }
      if (opts.name) {
        conditions.push(`(LastName == "${opts.name}" || NickName == "${opts.name}")`);
      }
      if (opts.phone) {
        conditions.push(`PhoneNumbers.Any(Number.StartsWith("${opts.phone}"))`);
      }

      const query: SearchQuery = {};
      if (conditions.length > 0) {
        query.where = conditions.join(" && ");
      }
      if (opts.top) {
        query.take = parseInt(opts.top, 10);
      }

      const result = await client.search("people", query);
      output(result, { json: true });
    });

  people
    .command("get")
    .description("Get a person by ID")
    .argument("<id>", "Person ID")
    .option("--attributes", "Load attributes")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { attributes?: boolean; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const person = await client.getOne("people", id);

      if (opts.attributes) {
        const attrs = await client.getAttributes("people", id);
        output({ ...person as Record<string, unknown>, Attributes: attrs }, { json: true });
      } else {
        output(person, { json: true });
      }
    });

  people
    .command("create")
    .description("Create a new person")
    .requiredOption("--first <first>", "First name")
    .requiredOption("--last <last>", "Last name")
    .requiredOption("--email <email>", "Email address")
    .option("--phone <phone>", "Phone number")
    .option("--campus <id>", "Campus ID")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { first: string; last: string; email: string; phone?: string; campus?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const body: Record<string, unknown> = {
        FirstName: opts.first,
        LastName: opts.last,
        Email: opts.email,
      };
      if (opts.phone) {
        body.PhoneNumbers = [{ Number: opts.phone }];
      }
      if (opts.campus) {
        body.CampusId = parseInt(opts.campus, 10);
      }

      const result = await client.create("people", body);
      output(result, { json: true });
    });

  people
    .command("update")
    .description("Update a person")
    .argument("<id>", "Person ID")
    .option("--email <email>", "Email address")
    .option("--phone <phone>", "Phone number")
    .option("--first <first>", "First name")
    .option("--last <last>", "Last name")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { email?: string; phone?: string; first?: string; last?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const body: Record<string, unknown> = {};
      if (opts.email) body.Email = opts.email;
      if (opts.first) body.FirstName = opts.first;
      if (opts.last) body.LastName = opts.last;
      if (opts.phone) body.PhoneNumbers = [{ Number: opts.phone }];

      await client.update("people", id, body);
      output({ success: true }, { json: true });
    });

  people
    .command("family")
    .description("Get family members for a person")
    .argument("<id>", "Person ID")
    .option("--profile <name>", "Profile to use")
    .action(async (id: string, opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      // Family group type GUID in Rock RMS
      const familyGroupTypeGuid = "790E3215-3B10-442B-AF69-616C0DCB998E";
      const result = await client.search("groupmembers", {
        where: `PersonId == ${id} && Group.GroupType.Guid == "${familyGroupTypeGuid}"`,
      });
      output(result, { json: true });
    });

  return people;
}
