import { Command } from "commander";
import { getActiveProfile } from "../config.ts";
import { RockClient } from "../client.ts";
import { output } from "../output.ts";
import type { SearchQuery } from "../utils/search.ts";

export function makeContentCommand(): Command {
  const content = new Command("content").description("Manage content channels and items");

  content
    .command("channels")
    .description("List content channels")
    .option("--profile <name>", "Profile to use")
    .action(async (opts: { profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const result = await client.search("contentchannels");
      output(result, { json: true });
    });

  content
    .command("items")
    .description("List content channel items")
    .argument("<channelId>", "Content channel ID")
    .option("--top <n>", "Limit number of results")
    .option("--profile <name>", "Profile to use")
    .action(async (channelId: string, opts: { top?: string; profile?: string }) => {
      const profile = getActiveProfile(opts.profile);
      const client = new RockClient(profile);
      const query: SearchQuery = {
        where: `ContentChannelId == ${channelId}`,
      };
      if (opts.top) {
        query.take = parseInt(opts.top, 10);
      }
      const result = await client.search("contentchannelitems", query);
      output(result, { json: true });
    });

  content
    .command("create-item")
    .description("Create a content channel item")
    .argument("<channelId>", "Content channel ID")
    .option("--title <title>", "Item title")
    .option("--content <content>", "Item content")
    .option("--status <status>", "Item status")
    .option("--profile <name>", "Profile to use")
    .action(
      async (
        channelId: string,
        opts: { title?: string; content?: string; status?: string; profile?: string }
      ) => {
        const profile = getActiveProfile(opts.profile);
        const client = new RockClient(profile);
        const body: Record<string, unknown> = {
          ContentChannelId: parseInt(channelId, 10),
        };
        if (opts.title) body.Title = opts.title;
        if (opts.content) body.Content = opts.content;
        if (opts.status) body.Status = parseInt(opts.status, 10);
        const result = await client.create("contentchannelitems", body);
        output(result, { json: true });
      }
    );

  return content;
}
