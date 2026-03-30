import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";

export function makeCommCommand(): Command {
  const comm = new Command("comm").description("Communication commands");

  comm
    .command("send-sms")
    .description("Send an SMS communication")
    .requiredOption("--to <personId>", "Recipient person alias ID", parseInt)
    .requiredOption("--from <number>", "SMS from number")
    .requiredOption("--body <text>", "Message body")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { to: number; from: string; body: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const result = await client.post("/api/Communications", {
        CommunicationMediumEntityTypeId: 2,
        Recipients: [{ PersonAliasId: opts.to }],
        SMSFromDefinedValueId: opts.from,
        Message: opts.body,
      });

      output(result, { json: true });
    });

  comm
    .command("send-email")
    .description("Send an email communication")
    .requiredOption("--to <personId>", "Recipient person alias ID", parseInt)
    .requiredOption("--template <id>", "Communication template ID", parseInt)
    .requiredOption("--subject <s>", "Email subject")
    .requiredOption("--body <b>", "Email body")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { to: number; template: number; subject: string; body: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const result = await client.post("/api/Communications", {
        CommunicationMediumEntityTypeId: 1,
        Recipients: [{ PersonAliasId: opts.to }],
        CommunicationTemplateId: opts.template,
        Subject: opts.subject,
        Message: opts.body,
      });

      output(result, { json: true });
    });

  comm
    .command("templates")
    .description("List communication templates")
    .option("--type <type>", "Filter by type (sms or email)")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { type?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const query: { filter?: string } = {};
      if (opts.type) {
        query.filter = `MediumEntityType eq '${opts.type}'`;
      }

      const hasFilter = Object.keys(query).length > 0;
      const result = await client.get<unknown[]>(
        "/api/CommunicationTemplates",
        hasFilter ? query : undefined
      );

      output(result, { json: true });
    });

  return comm;
}
