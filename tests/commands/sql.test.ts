import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeSqlCommand } from "../../src/commands/sql.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-sql-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function freshProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.addCommand(makeSqlCommand());
  return program;
}

function writeConfig(magnus: boolean): void {
  const config: RockConfig = {
    profiles: {
      default: { url: "https://rock.example.com", apiKey: "test-key", magnus },
    },
    activeProfile: "default",
  };
  saveConfig(config);
}

describe("sql command", () => {
  let originalFetch: typeof globalThis.fetch;
  let writeSpy: ReturnType<typeof spyOn>;
  let stderrSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.ROCK_CONFIG_PATH = TEST_CONFIG_PATH;
    originalFetch = globalThis.fetch;

    writeSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    exitSpy = spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`__EXIT__:${code ?? 0}`);
    }) as never);
  });

  afterEach(() => {
    delete process.env.ROCK_CONFIG_PATH;
    globalThis.fetch = originalFetch;
    writeSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
    if (existsSync(TEST_CONFIG_PATH)) unlinkSync(TEST_CONFIG_PATH);
  });

  test("exits with friendly error when magnus is disabled and never calls fetch", async () => {
    writeConfig(false);
    let fetchCalled = false;
    globalThis.fetch = mock(async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    let thrown: unknown;
    try {
      await freshProgram().parseAsync(["sql", "query", "SELECT 1"], { from: "user" });
    } catch (e) {
      thrown = e;
    }

    expect(String(thrown)).toContain("__EXIT__:1");
    expect(fetchCalled).toBe(false);
    const stderrOutput = stderrSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(stderrOutput).toContain("Magnus is not enabled for profile 'default'");
  });

  test("query runs synchronous result and prints rows", async () => {
    writeConfig(true);
    const calls: { url: string; method: string; body?: unknown }[] = [];

    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      calls.push({
        url,
        method: init?.method ?? "GET",
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      return new Response(
        JSON.stringify({
          Identifier: "abc",
          IsComplete: true,
          Duration: 12,
          Messages: [{ Message: "(1 row affected)" }],
          ResultSets: [
            {
              Columns: [{ Name: "One", Type: 2 }],
              Rows: [[1]],
            },
          ],
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    await freshProgram().parseAsync(["sql", "query", "SELECT 1 AS One"], { from: "user" });

    expect(calls.length).toBe(1);
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.url).toContain("/api/TriumphTech/Magnus/Sql/ExecuteQuery");
    expect(calls[0]!.body).toEqual({ query: "SELECT 1 AS One" });

    const out = writeSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(out).toContain("One");
    expect(out).toContain("1");
  });

  test("query polls Status when first response is not complete", async () => {
    writeConfig(true);
    const calls: { url: string; method: string }[] = [];
    let pollCount = 0;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      const method = init?.method ?? "GET";
      calls.push({ url, method });
      if (url.includes("/ExecuteQuery")) {
        return new Response(
          JSON.stringify({
            Identifier: "id-1",
            IsComplete: false,
            Duration: 0,
            Messages: [],
            ResultSets: null,
          }),
          { status: 200 }
        );
      }
      if (url.includes("/Status/")) {
        pollCount++;
        if (pollCount < 2) {
          return new Response(
            JSON.stringify({
              Identifier: "id-1",
              IsComplete: false,
              Duration: 0,
              Messages: [],
              ResultSets: null,
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            Identifier: "id-1",
            IsComplete: true,
            Duration: 100,
            Messages: [],
            ResultSets: [
              {
                Columns: [{ Name: "v", Type: 2 }],
                Rows: [[42]],
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    await freshProgram().parseAsync(
      ["sql", "query", "SELECT 42", "--poll-interval", "1"],
      { from: "user" }
    );

    const statusCalls = calls.filter((c) => c.url.includes("/Status/"));
    expect(statusCalls.length).toBeGreaterThanOrEqual(2);
    const out = writeSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(out).toContain("42");
  });

  test("info subcommand calls Connect and prints metadata", async () => {
    writeConfig(true);
    let calledUrl: string | undefined;
    let calledMethod: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      calledUrl = input.toString();
      calledMethod = init?.method ?? "GET";
      return new Response(
        JSON.stringify({
          DatabaseName: "test-db",
          OSVersion: "Linux",
          RockVersion: "Rock McKinley 18.2",
          SqlEdition: "SQL Azure",
          SqlVersion: "12.0.2000.8",
        }),
        { status: 200 }
      );
    }) as typeof fetch;

    await freshProgram().parseAsync(["sql", "info"], { from: "user" });

    expect(calledMethod).toBe("POST");
    expect(calledUrl).toContain("/api/TriumphTech/Magnus/Sql/Connect");
    const out = writeSpy.mock.calls.map((c) => String(c[0])).join("");
    expect(out).toContain("Rock McKinley 18.2");
    expect(out).toContain("test-db");
  });

  test("server error response is surfaced", async () => {
    writeConfig(true);
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({ Message: "Invalid object name 'Foo'." }),
        { status: 500, statusText: "Internal Server Error" }
      );
    }) as typeof fetch;

    let err: unknown;
    try {
      await freshProgram().parseAsync(["sql", "query", "SELECT * FROM Foo"], {
        from: "user",
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err)).toContain("Rock API error");
  });
});
