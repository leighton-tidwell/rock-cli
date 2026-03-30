import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeAttendanceCommand } from "../../src/commands/attendance.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-attendance-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function setupProgram(): Command {
  const program = new Command();
  program.addCommand(makeAttendanceCommand());
  return program;
}

describe("attendance command", () => {
  let originalFetch: typeof globalThis.fetch;
  let writeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.ROCK_CONFIG_PATH = TEST_CONFIG_PATH;
    originalFetch = globalThis.fetch;

    const config: RockConfig = {
      profiles: { default: { url: "https://rock.example.com", apiKey: "test-key" } },
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

  describe("list", () => {
    test("calls GET /api/Attendances with no filters", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list"], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/Attendances");
    });

    test("filters by --group", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list", "--group", "42"], { from: "user" });

      expect(capturedUrl).toContain("GroupId eq 42");
    });

    test("filters by --person", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list", "--person", "7"], { from: "user" });

      expect(capturedUrl).toContain("PersonAliasId eq 7");
    });

    test("filters by --date", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list", "--date", "2024-01-15"], { from: "user" });

      expect(capturedUrl).toContain("StartDateTime eq datetime'2024-01-15'");
    });

    test("filters by --from and --to", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list", "--from", "2024-01-01", "--to", "2024-01-31"], { from: "user" });

      expect(capturedUrl).toContain("StartDateTime ge datetime'2024-01-01'");
      expect(capturedUrl).toContain("StartDateTime le datetime'2024-01-31'");
    });

    test("applies --top", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list", "--top", "5"], { from: "user" });

      expect(capturedUrl).toContain("$top=5");
    });

    test("combines multiple filters", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list", "--group", "42", "--person", "7", "--top", "10"], { from: "user" });

      expect(capturedUrl).toContain("GroupId eq 42");
      expect(capturedUrl).toContain("PersonAliasId eq 7");
      expect(capturedUrl).toContain("$top=10");
    });

    test("outputs the response data", async () => {
      const data = [{ Id: 1, PersonAliasId: 7, GroupId: 42 }];
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(data), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync(["attendance", "list"], { from: "user" });

      const written = writeSpy.mock.calls.map((c) => c[0]).join("");
      expect(JSON.parse(written)).toEqual(data);
    });
  });

  describe("record", () => {
    test("POSTs to /api/Attendances with required fields", async () => {
      let capturedUrl: string | undefined;
      let capturedBody: string | undefined;
      let capturedMethod: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method;
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ Id: 99 }), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync([
        "attendance", "record",
        "--person", "7",
        "--group", "42",
        "--schedule", "3",
        "--date", "2024-01-15",
      ], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/Attendances");
      expect(capturedMethod).toBe("POST");
      const body = JSON.parse(capturedBody!);
      expect(body.PersonAliasId).toBe(7);
      expect(body.GroupId).toBe(42);
      expect(body.ScheduleId).toBe(3);
      expect(body.StartDateTime).toBe("2024-01-15");
    });

    test("outputs the response from POST", async () => {
      const response = { Id: 99 };
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(response), { status: 200 });
      }) as typeof fetch;

      await setupProgram().parseAsync([
        "attendance", "record",
        "--person", "7",
        "--group", "42",
        "--schedule", "3",
        "--date", "2024-01-15",
      ], { from: "user" });

      const written = writeSpy.mock.calls.map((c) => c[0]).join("");
      expect(JSON.parse(written)).toEqual(response);
    });

    test("requires --person, --group, --schedule, and --date", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({}), { status: 200 });
      }) as typeof fetch;

      // Commander will throw/exit on missing required options
      // We test that the command defines them as required by checking it errors
      const program = setupProgram();
      program.exitOverride();
      program.commands.forEach((c) => {
        c.exitOverride();
        c.commands.forEach((sc) => sc.exitOverride());
      });

      await expect(
        program.parseAsync(["attendance", "record"], { from: "user" })
      ).rejects.toThrow();
    });
  });
});
