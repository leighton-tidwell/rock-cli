import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { loadConfig, saveConfig, getActiveProfile } from "../src/config.ts";
import type { RockConfig } from "../src/config.ts";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_DIR = join(tmpdir(), "rock-cli-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

// We'll override the config path via env var
describe("config", () => {
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

  test("saveConfig writes and loadConfig reads back", () => {
    const config: RockConfig = {
      profiles: {
        default: { url: "https://rock.example.com/api", apiKey: "abc123" },
      },
      activeProfile: "default",
    };
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded).toEqual(config);
  });

  test("loadConfig throws on missing config", () => {
    expect(() => loadConfig()).toThrow();
  });

  test("getActiveProfile returns active profile", () => {
    const config: RockConfig = {
      profiles: {
        default: { url: "https://rock.example.com/api", apiKey: "abc123" },
        staging: { url: "https://staging.example.com/api", apiKey: "def456" },
      },
      activeProfile: "default",
    };
    saveConfig(config);
    const profile = getActiveProfile();
    expect(profile.url).toBe("https://rock.example.com/api");
  });

  test("getActiveProfile with override selects different profile", () => {
    const config: RockConfig = {
      profiles: {
        default: { url: "https://rock.example.com/api", apiKey: "abc123" },
        staging: { url: "https://staging.example.com/api", apiKey: "def456" },
      },
      activeProfile: "default",
    };
    saveConfig(config);
    const profile = getActiveProfile("staging");
    expect(profile.url).toBe("https://staging.example.com/api");
  });

  test("getActiveProfile throws on unknown profile override", () => {
    const config: RockConfig = {
      profiles: {
        default: { url: "https://rock.example.com/api", apiKey: "abc123" },
      },
      activeProfile: "default",
    };
    saveConfig(config);
    expect(() => getActiveProfile("nonexistent")).toThrow("nonexistent");
  });

  test("saveConfig with defaultCampusId", () => {
    const config: RockConfig = {
      profiles: {
        default: { url: "https://rock.example.com/api", apiKey: "abc123", defaultCampusId: 1 },
      },
      activeProfile: "default",
    };
    saveConfig(config);
    const loaded = loadConfig();
    expect(loaded.profiles.default!.defaultCampusId).toBe(1);
  });
});
