import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeContentCommand } from "../../src/commands/content.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-content-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

describe("content command", () => {
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

  test("channels fetches /api/ContentChannels", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([{ Id: 1, Name: "Website" }]), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeContentCommand());
    await program.parseAsync(["content", "channels"], { from: "user" });

    expect(capturedUrl).toBe("https://rock.example.com/api/ContentChannels");
  });

  test("items fetches with filter on ContentChannelId", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([{ Id: 10, Title: "Post" }]), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeContentCommand());
    await program.parseAsync(["content", "items", "5"], { from: "user" });

    expect(capturedUrl).toBe(
      "https://rock.example.com/api/ContentChannelItems?$filter=ContentChannelId eq 5"
    );
  });

  test("items respects --top option", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeContentCommand());
    await program.parseAsync(["content", "items", "5", "--top", "10"], { from: "user" });

    expect(capturedUrl).toContain("$top=10");
    expect(capturedUrl).toContain("$filter=ContentChannelId eq 5");
  });

  test("create-item POSTs to /api/ContentChannelItems", async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedBody: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedMethod = init?.method;
      capturedBody = init?.body as string;
      return new Response(JSON.stringify(42), { status: 200 });
    }) as typeof fetch;

    const program = new Command();
    program.addCommand(makeContentCommand());
    await program.parseAsync(
      ["content", "create-item", "5", "--title", "My Post", "--content", "Body text", "--status", "2"],
      { from: "user" }
    );

    expect(capturedUrl).toBe("https://rock.example.com/api/ContentChannelItems");
    expect(capturedMethod).toBe("POST");
    const body = JSON.parse(capturedBody!);
    expect(body.ContentChannelId).toBe(5);
    expect(body.Title).toBe("My Post");
    expect(body.Content).toBe("Body text");
    expect(body.Status).toBe(2);
  });
});
