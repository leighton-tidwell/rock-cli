import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { SearchQuery } from "../utils/search.ts";

export function makeGivingCommand(): Command {
  const giving = new Command("giving").description("Financial giving commands");

  giving
    .command("transactions")
    .description("List financial transactions")
    .option("--person <id>", "Filter by AuthorizedPersonAliasId")
    .option("--from <date>", "Filter transactions from date (YYYY-MM-DD)")
    .option("--to <date>", "Filter transactions to date (YYYY-MM-DD)")
    .option("--account <id>", "Filter by financial account id")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (opts) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);

      const conditions: string[] = [];
      if (opts.person) {
        conditions.push(`AuthorizedPersonAliasId == ${opts.person}`);
      }
      if (opts.from) {
        const [y, m, d] = opts.from.split("-").map(Number);
        conditions.push(`TransactionDateTime >= DateTime(${y}, ${m}, ${d})`);
      }
      if (opts.to) {
        const [y, m, d] = opts.to.split("-").map(Number);
        conditions.push(`TransactionDateTime <= DateTime(${y}, ${m}, ${d})`);
      }
      if (opts.account) {
        conditions.push(`FinancialPaymentDetail.FinancialAccountId == ${opts.account}`);
      }

      const query: SearchQuery = {};
      if (conditions.length > 0) {
        query.where = conditions.join(" && ");
      }
      if (opts.top) {
        query.take = parseInt(opts.top, 10);
      }

      const result = await client.search("financialtransactions", query);
      output(result, { json: true });
    });

  giving
    .command("accounts")
    .description("List financial accounts")
    .option("--profile <name>", "Profile to use")
    .action(async (opts) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const result = await client.search("financialaccounts");
      output(result, { json: true });
    });

  giving
    .command("summary")
    .description("Summarize giving for a person and year")
    .requiredOption("--person <id>", "AuthorizedPersonAliasId")
    .requiredOption("--year <year>", "Year to summarize")
    .option("--profile <name>", "Profile to use")
    .action(async (opts) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const personId = parseInt(opts.person, 10);
      const year = parseInt(opts.year, 10);

      const query: SearchQuery = {
        where: [
          `AuthorizedPersonAliasId == ${personId}`,
          `TransactionDateTime >= DateTime(${year}, 1, 1)`,
          `TransactionDateTime <= DateTime(${year}, 12, 31)`,
        ].join(" && "),
      };

      const result = await client.search<{ TotalAmount: number }>(
        "financialtransactions",
        query
      );

      const totalAmount = result.items.reduce((sum, t) => sum + (t.TotalAmount || 0), 0);
      const totalRounded = Math.round(totalAmount * 100) / 100;

      output(
        {
          person: personId,
          year,
          transactionCount: result.count,
          totalAmount: totalRounded,
        },
        { json: true }
      );
    });

  return giving;
}
