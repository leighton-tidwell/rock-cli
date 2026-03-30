import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeCampusesCommand } from "../../src/commands/campuses.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-campuses-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

describe("campuses command", () => {
  let originalFetch: typeof globalThis.fetch;
  let writeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.ROCK_CONFIG_PATH = TEST_CONFIG_PATH;
    originalFetch = globalThis.fetch;

    const config: RockConfig = {
      profiles: { default: { url: "https://rock.example.com/api", apiKey: "test-key" } },
      activeProfile: "default",
    };
    saveConfig(config);

    writeSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    delete process.env.ROCK_CONFIG_PATH;
    globalThis.fetch = originalFetch;
    writeSpy.mockRestore();
    if (existsSync(TEST_CONFIG_PATH)) {
      unlinkSync(TEST_CONFIG_PATH);
    }
  });

  test("list fetches /api/Campuses", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([{ Id: 1, Name: "Main" }]), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeCampusesCommand());
    await program.parseAsync(["campuses", "list"], { from: "user" });

    expect(capturedUrl).toBe("https://rock.example.com/api/Campuses");
  });

  test("get fetches /api/Campuses/<id>", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ Id: 3, Name: "West" }), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeCampusesCommand());
    await program.parseAsync(["campuses", "get", "3"], { from: "user" });

    expect(capturedUrl).toBe("https://rock.example.com/api/Campuses/3");
  });
});
