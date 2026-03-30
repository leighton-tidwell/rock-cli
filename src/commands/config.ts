import { Command } from "commander";
import { loadConfig, saveConfig, type RockConfig } from "../config.ts";

export function makeConfigCommand(): Command {
  const config = new Command("config").description("Manage Rock CLI configuration");

  config
    .command("init")
    .description("Initialize configuration with URL and API key")
    .argument("<url>", "Rock RMS API base URL")
    .argument("<apiKey>", "API key for authentication")
    .action((url: string, apiKey: string) => {
      const newConfig: RockConfig = {
        profiles: {
          default: { url, apiKey },
        },
        activeProfile: "default",
      };
      saveConfig(newConfig);
      console.log("Configuration saved.");
    });

  config
    .command("set-url")
    .description("Update active profile URL")
    .argument("<url>", "New API base URL")
    .action((url: string) => {
      const cfg = loadConfig();
      cfg.profiles[cfg.activeProfile]!.url = url;
      saveConfig(cfg);
      console.log(`URL updated for profile '${cfg.activeProfile}'.`);
    });

  config
    .command("set-key")
    .description("Update active profile API key")
    .argument("<key>", "New API key")
    .action((key: string) => {
      const cfg = loadConfig();
      cfg.profiles[cfg.activeProfile]!.apiKey = key;
      saveConfig(cfg);
      console.log(`API key updated for profile '${cfg.activeProfile}'.`);
    });

  config
    .command("show")
    .description("Show current configuration")
    .action(() => {
      const cfg = loadConfig();
      console.log(JSON.stringify(cfg, null, 2));
    });

  const profileCmd = config
    .command("profile")
    .description("Switch or manage profiles")
    .argument("[name]", "Profile name to switch to")
    .action((name?: string) => {
      if (!name) {
        const cfg = loadConfig();
        console.log(`Active profile: ${cfg.activeProfile}`);
        console.log(`Available: ${Object.keys(cfg.profiles).join(", ")}`);
        return;
      }
      const cfg = loadConfig();
      if (!cfg.profiles[name]) {
        throw new Error(`Profile '${name}' not found.`);
      }
      cfg.activeProfile = name;
      saveConfig(cfg);
      console.log(`Switched to profile '${name}'.`);
    });

  profileCmd
    .command("add")
    .description("Create a new profile")
    .argument("<name>", "Profile name")
    .option("--url <url>", "API base URL", "")
    .option("--key <key>", "API key", "")
    .action((name: string, opts: { url: string; key: string }) => {
      const cfg = loadConfig();
      cfg.profiles[name] = { url: opts.url, apiKey: opts.key };
      saveConfig(cfg);
      console.log(`Profile '${name}' created.`);
    });

  return config;
}
