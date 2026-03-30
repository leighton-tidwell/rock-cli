import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeGroupsCommand } from "../../src/commands/groups.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-groups-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function makeProgram(): Command {
  const program = new Command();
  program
    .option("--json", "Output as formatted JSON")
    .option("--table", "Output as table")
    .option("--raw", "Output as compact JSON");
  program.addCommand(makeGroupsCommand());
  return program;
}

describe("groups command", () => {
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
    test("calls /api/Groups with no filters by default", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([{ Id: 1, Name: "Group A" }]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "list"], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/Groups");
    });

    test("applies --type filter", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "list", "--type", "25"], { from: "user" });

      expect(capturedUrl).toContain("GroupTypeId eq 25");
    });

    test("applies --campus filter", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "list", "--campus", "3"], { from: "user" });

      expect(capturedUrl).toContain("CampusId eq 3");
    });

    test("applies --top option", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "list", "--top", "10"], { from: "user" });

      expect(capturedUrl).toContain("$top=10");
    });

    test("combines multiple filters", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "list", "--type", "25", "--campus", "3", "--top", "5"], { from: "user" });

      expect(capturedUrl).toContain("GroupTypeId eq 25");
      expect(capturedUrl).toContain("CampusId eq 3");
      expect(capturedUrl).toContain("$top=5");
    });
  });

  describe("get", () => {
    test("calls /api/Groups/<id>", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify({ Id: 42, Name: "Test Group" }), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "get", "42"], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/Groups/42");
    });

    test("passes loadAttributes=simple when --attributes flag set", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "get", "42", "--attributes"], { from: "user" });

      expect(capturedUrl).toContain("loadAttributes=simple");
    });
  });

  describe("members", () => {
    test("calls /api/GroupMembers with GroupId filter and Person expand", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([{ Id: 1, PersonId: 10 }]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "members", "42"], { from: "user" });

      expect(capturedUrl).toContain("/api/GroupMembers");
      expect(capturedUrl).toContain("GroupId eq 42");
      expect(capturedUrl).toContain("$expand=Person");
    });
  });

  describe("add-member", () => {
    test("POSTs to /api/GroupMembers with correct body", async () => {
      let capturedUrl = "";
      let capturedBody = "";
      let capturedMethod = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method ?? "";
        capturedBody = (init?.body as string) ?? "";
        return new Response(JSON.stringify(123), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "add-member", "42", "10", "--role", "2"], { from: "user" });

      expect(capturedMethod).toBe("POST");
      expect(capturedUrl).toBe("https://rock.example.com/api/GroupMembers");
      const body = JSON.parse(capturedBody);
      expect(body.GroupId).toBe(42);
      expect(body.PersonId).toBe(10);
      expect(body.GroupRoleId).toBe(2);
    });
  });

  describe("remove-member", () => {
    test("finds GroupMember then DELETEs it", async () => {
      const calls: { url: string; method: string }[] = [];
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input.toString();
        const method = init?.method ?? "GET";
        calls.push({ url, method });

        if (method === "GET") {
          return new Response(JSON.stringify([{ Id: 99, GroupId: 42, PersonId: 10 }]), { status: 200 });
        }
        // DELETE
        return new Response(null, { status: 204, headers: { "content-length": "0" } });
      }) as typeof fetch;

      const program = makeProgram();
      await program.parseAsync(["groups", "remove-member", "42", "10"], { from: "user" });

      expect(calls.length).toBe(2);
      expect(calls[0]!.method).toBe("GET");
      expect(calls[0]!.url).toContain("GroupId eq 42");
      expect(calls[0]!.url).toContain("PersonId eq 10");
      expect(calls[1]!.method).toBe("DELETE");
      expect(calls[1]!.url).toContain("/api/GroupMembers/99");
    });

    test("throws when no matching GroupMember found", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = makeProgram();
      program.exitOverride();

      await expect(
        program.parseAsync(["groups", "remove-member", "42", "10"], { from: "user" })
      ).rejects.toThrow();
    });
  });
});
