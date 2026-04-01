import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { SearchQuery } from "../utils/search.ts";

/**
 * Parse a date string (YYYY-MM-DD or similar) into Dynamic LINQ DateTime() format.
 */
function toLinqDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `DateTime(${d.getFullYear()}, ${d.getMonth() + 1}, ${d.getDate()})`;
}

export function makeAttendanceCommand(): Command {
  const attendance = new Command("attendance")
    .description("Manage attendance records");

  attendance
    .command("list")
    .description("List attendance records with optional filters")
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

      const conditions: string[] = [];
      if (opts.group) conditions.push(`GroupId == ${opts.group}`);
      if (opts.person) conditions.push(`PersonAliasId == ${opts.person}`);
      if (opts.date) conditions.push(`StartDateTime == ${toLinqDate(opts.date)}`);
      if (opts.from) conditions.push(`StartDateTime >= ${toLinqDate(opts.from)}`);
      if (opts.to) conditions.push(`StartDateTime <= ${toLinqDate(opts.to)}`);

      const query: SearchQuery = {};
      if (conditions.length > 0) {
        query.where = conditions.join(" && ");
      }
      if (opts.top) {
        query.take = parseInt(opts.top, 10);
      }

      const result = await client.search("attendances", query);
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

      const result = await client.create("attendances", body);
      output(result, { json: true });
    });

  return attendance;
}
