import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { ODataQuery } from "../utils/odata.ts";

export function makeAttendanceCommand(): Command {
  const attendance = new Command("attendance")
    .description("Manage attendance records");

  attendance
    .command("list")
    .description("List attendance records with optional OData filters")
    .option("--group <id>", "Filter by GroupId")
    .option("--date <date>", "Filter by exact date")
    .option("--person <id>", "Filter by PersonAliasId")
    .option("--from <date>", "Filter by start date (>=)")
    .option("--to <date>", "Filter by end date (<=)")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: {
      group?: string;
      date?: string;
      person?: string;
      from?: string;
      to?: string;
      top?: string;
      profile?: string;
    }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const filters: string[] = [];
      if (opts.group) filters.push(`GroupId eq ${opts.group}`);
      if (opts.person) filters.push(`PersonAliasId eq ${opts.person}`);
      if (opts.date) filters.push(`StartDateTime eq datetime'${opts.date}'`);
      if (opts.from) filters.push(`StartDateTime ge datetime'${opts.from}'`);
      if (opts.to) filters.push(`StartDateTime le datetime'${opts.to}'`);

      const query: ODataQuery = {};
      if (filters.length > 0) {
        query.filter = filters.join(" and ");
      }
      if (opts.top) {
        query.top = parseInt(opts.top, 10);
      }

      const result = await client.get("/api/Attendances", query);
      output(result, { json: true });
    });

  attendance
    .command("record")
    .description("Record a new attendance entry")
    .requiredOption("--person <id>", "PersonAliasId")
    .requiredOption("--group <id>", "GroupId")
    .requiredOption("--schedule <id>", "ScheduleId")
    .requiredOption("--date <date>", "StartDateTime")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: {
      person: string;
      group: string;
      schedule: string;
      date: string;
      profile?: string;
    }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const body = {
        PersonAliasId: parseInt(opts.person, 10),
        GroupId: parseInt(opts.group, 10),
        ScheduleId: parseInt(opts.schedule, 10),
        StartDateTime: opts.date,
      };

      const result = await client.post("/api/Attendances", body);
      output(result, { json: true });
    });

  return attendance;
}
