import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { ODataQuery } from "../utils/odata.ts";

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

      const filters: string[] = [];
      if (opts.person) {
        filters.push(`AuthorizedPersonAliasId eq ${opts.person}`);
      }
      if (opts.from) {
        filters.push(`TransactionDateTime ge datetime'${opts.from}'`);
      }
      if (opts.to) {
        filters.push(`TransactionDateTime le datetime'${opts.to}'`);
      }
      if (opts.account) {
        filters.push(`FinancialPaymentDetail/FinancialAccountId eq ${opts.account}`);
      }

      const query: ODataQuery = {};
      if (filters.length > 0) {
        query.filter = filters.join(" and ");
      }
      if (opts.top) {
        query.top = parseInt(opts.top, 10);
      }

      const result = await client.get("/api/FinancialTransactions", query);
      output(result, { json: true });
    });

  giving
    .command("accounts")
    .description("List financial accounts")
    .option("--profile <name>", "Profile to use")
    .action(async (opts) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const result = await client.get("/api/FinancialAccounts");
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

      const filters = [
        `AuthorizedPersonAliasId eq ${personId}`,
        `TransactionDateTime ge datetime'${year}-01-01'`,
        `TransactionDateTime le datetime'${year}-12-31'`,
      ];

      const query: ODataQuery = {
        filter: filters.join(" and "),
      };

      const transactions = await client.get<{ TotalAmount: number }[]>(
        "/api/FinancialTransactions",
        query
      );

      const totalAmount = transactions.reduce((sum, t) => sum + (t.TotalAmount || 0), 0);
      const totalRounded = Math.round(totalAmount * 100) / 100;

      output(
        {
          person: personId,
          year,
          transactionCount: transactions.length,
          totalAmount: totalRounded,
        },
        { json: true }
      );
    });

  return giving;
}
