import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makePeopleCommand } from "../../src/commands/people.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-people-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function makeProgram(): Command {
  const program = new Command();
  program.addCommand(makePeopleCommand());
  return program;
}

describe("people command", () => {
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

  // --- search ---

  test("search by email builds correct filter", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "search", "--email", "ted@test.com"], { from: "user" });

    expect(capturedUrl).toContain("$filter=Email eq 'ted@test.com'");
    expect(capturedUrl).toContain("/api/People");
  });

  test("search by name builds correct filter", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "search", "--name", "Decker"], { from: "user" });

    expect(capturedUrl).toContain("$filter=LastName eq 'Decker' or NickName eq 'Decker'");
  });

  test("search by phone builds correct filter", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "search", "--phone", "555"], { from: "user" });

    expect(capturedUrl).toContain("$filter=PhoneNumbers/any(a:startswith(a/Number, '555'))");
  });

  test("search with --top passes $top", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "search", "--email", "a@b.com", "--top", "5"], { from: "user" });

    expect(capturedUrl).toContain("$top=5");
  });

  // --- get ---

  test("get fetches person by id", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ Id: 42, FirstName: "Ted" }), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "get", "42"], { from: "user" });

    expect(capturedUrl).toContain("/api/People/42");
    expect(capturedUrl).not.toContain("loadAttributes");
  });

  test("get with --attributes adds loadAttributes=simple", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "get", "42", "--attributes"], { from: "user" });

    expect(capturedUrl).toContain("loadAttributes=simple");
  });

  // --- create ---

  test("create posts person with required fields", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    let capturedMethod = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedBody = init?.body as string;
      capturedMethod = init?.method ?? "";
      return new Response(JSON.stringify(123), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(
      ["people", "create", "--first", "Ted", "--last", "Decker", "--email", "ted@test.com"],
      { from: "user" }
    );

    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toContain("/api/People");
    const body = JSON.parse(capturedBody);
    expect(body.FirstName).toBe("Ted");
    expect(body.LastName).toBe("Decker");
    expect(body.Email).toBe("ted@test.com");
  });

  test("create with optional phone and campus", async () => {
    let capturedBody = "";
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(JSON.stringify(123), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(
      ["people", "create", "--first", "Ted", "--last", "Decker", "--email", "ted@test.com", "--phone", "5551234", "--campus", "1"],
      { from: "user" }
    );

    const body = JSON.parse(capturedBody);
    expect(body.PhoneNumbers).toEqual([{ Number: "5551234" }]);
    expect(body.CampusId).toBe(1);
  });

  // --- update ---

  test("update patches person with changed fields", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    let capturedMethod = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      capturedBody = init?.body as string;
      capturedMethod = init?.method ?? "";
      return new Response(null, { status: 204, headers: { "content-length": "0" } });
    }) as typeof fetch;

    await makeProgram().parseAsync(
      ["people", "update", "42", "--email", "new@test.com", "--first", "Theodore"],
      { from: "user" }
    );

    expect(capturedMethod).toBe("PATCH");
    expect(capturedUrl).toContain("/api/People/42");
    const body = JSON.parse(capturedBody);
    expect(body.Email).toBe("new@test.com");
    expect(body.FirstName).toBe("Theodore");
  });

  test("update patches phone", async () => {
    let capturedBody = "";
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return new Response(null, { status: 204, headers: { "content-length": "0" } });
    }) as typeof fetch;

    await makeProgram().parseAsync(
      ["people", "update", "42", "--phone", "5559999"],
      { from: "user" }
    );

    const body = JSON.parse(capturedBody);
    expect(body.PhoneNumbers).toEqual([{ Number: "5559999" }]);
  });

  // --- family ---

  test("family fetches family members", async () => {
    let capturedUrl = "";
    globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([{ Id: 1 }, { Id: 2 }]), { status: 200 });
    }) as typeof fetch;

    await makeProgram().parseAsync(["people", "family", "42"], { from: "user" });

    expect(capturedUrl).toContain("/api/People/42/GetFamilyMembers");
  });
});
