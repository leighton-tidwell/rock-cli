import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeConfigCommand } from "../../src/commands/config.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-config-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

describe("config commands", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.ROCK_CONFIG_PATH = TEST_CONFIG_PATH;
  });

  afterEach(() => {
    delete process.env.ROCK_CONFIG_PATH;
    if (existsSync(TEST_CONFIG_PATH)) {
      unlinkSync(TEST_CONFIG_PATH);
    }
  });

  test("set-url updates the active profile URL", () => {
    const config: RockConfig = {
      profiles: { default: { url: "https://old.com/api", apiKey: "key" } },
      activeProfile: "default",
    };
    saveConfig(config);

    const program = new Command();
    program.addCommand(makeConfigCommand());
    program.parse(["config", "set-url", "https://new.com/api"], { from: "user" });

    const loaded = loadConfig();
    expect(loaded.profiles.default!.url).toBe("https://new.com/api");
  });

  test("set-key updates the active profile API key", () => {
    const config: RockConfig = {
      profiles: { default: { url: "https://rock.com/api", apiKey: "old-key" } },
      activeProfile: "default",
    };
    saveConfig(config);

    const program = new Command();
    program.addCommand(makeConfigCommand());
    program.parse(["config", "set-key", "new-key"], { from: "user" });

    const loaded = loadConfig();
    expect(loaded.profiles.default!.apiKey).toBe("new-key");
  });

  test("show prints current config", () => {
    const config: RockConfig = {
      profiles: { default: { url: "https://rock.com/api", apiKey: "key" } },
      activeProfile: "default",
    };
    saveConfig(config);

    // Just ensure it doesn't throw
    const program = new Command();
    program.addCommand(makeConfigCommand());
    expect(() => {
      program.parse(["config", "show"], { from: "user" });
    }).not.toThrow();
  });

  test("profile switches active profile", () => {
    const config: RockConfig = {
      profiles: {
        default: { url: "https://rock.com/api", apiKey: "key1" },
        staging: { url: "https://staging.com/api", apiKey: "key2" },
      },
      activeProfile: "default",
    };
    saveConfig(config);

    const program = new Command();
    program.addCommand(makeConfigCommand());
    program.parse(["config", "profile", "staging"], { from: "user" });

    const loaded = loadConfig();
    expect(loaded.activeProfile).toBe("staging");
  });

  test("profile add creates new profile", () => {
    const config: RockConfig = {
      profiles: { default: { url: "https://rock.com/api", apiKey: "key" } },
      activeProfile: "default",
    };
    saveConfig(config);

    const program = new Command();
    program.addCommand(makeConfigCommand());
    program.parse(["config", "profile", "add", "staging"], { from: "user" });

    const loaded = loadConfig();
    expect(loaded.profiles.staging).toBeDefined();
  });
});
