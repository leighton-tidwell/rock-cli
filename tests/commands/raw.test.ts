import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeRawCommand } from "../../src/commands/raw.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-raw-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

describe("raw command", () => {
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

  test("raw GET calls the correct URL", async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedMethod = init?.method;
      return new Response(JSON.stringify({ Id: 1 }), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeRawCommand());
    await program.parseAsync(["raw", "GET", "/People/1"], { from: "user" });

    expect(capturedUrl).toBe("https://rock.example.com/api/People/1");
    expect(capturedMethod).toBe("GET");
  });

  test("raw POST sends body", async () => {
    let capturedBody: string | undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify({ Id: 1 }), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeRawCommand());
    await program.parseAsync(["raw", "POST", "/People", "--body", '{"FirstName":"Ted"}'], { from: "user" });

    expect(JSON.parse(capturedBody!)).toEqual({ FirstName: "Ted" });
  });
});
