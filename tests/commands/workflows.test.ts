import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeWorkflowsCommand } from "../../src/commands/workflows.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-workflows-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function createProgram(): Command {
  const program = new Command();
  program.addCommand(makeWorkflowsCommand());
  return program;
}

describe("workflows command", () => {
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
    test("list --type types calls /api/WorkflowTypes", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([{ Id: 1, Name: "IT Request" }]), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "list", "--type", "types"], { from: "user" });

      expect(capturedUrl).toContain("/api/WorkflowTypes");
    });

    test("list --type workflows calls /api/Workflows", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([{ Id: 10, Status: "Active" }]), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "list", "--type", "workflows"], { from: "user" });

      expect(capturedUrl).toContain("/api/Workflows");
    });

    test("list --top passes $top query parameter", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "list", "--type", "types", "--top", "5"], { from: "user" });

      expect(capturedUrl).toContain("$top=5");
    });

    test("list defaults to types when --type not provided", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "list"], { from: "user" });

      expect(capturedUrl).toContain("/api/WorkflowTypes");
    });
  });

  describe("launch", () => {
    test("launch posts to /api/LaunchWorkflow/<typeId>", async () => {
      let capturedUrl: string | undefined;
      let capturedMethod: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method;
        return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "launch", "7"], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/LaunchWorkflow/7");
      expect(capturedMethod).toBe("POST");
    });

    test("launch sends attributes in body", async () => {
      let capturedBody: string | undefined;
      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(
        ["workflows", "launch", "7", "--attrs", '{"Requester":"Ted"}'],
        { from: "user" }
      );

      expect(JSON.parse(capturedBody!)).toEqual({ Requester: "Ted" });
    });

    test("launch with no attrs sends empty object", async () => {
      let capturedBody: string | undefined;
      globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "launch", "7"], { from: "user" });

      expect(JSON.parse(capturedBody!)).toEqual({});
    });
  });

  describe("status", () => {
    test("status fetches /api/Workflows/<id>", async () => {
      let capturedUrl: string | undefined;
      let capturedMethod: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method;
        return new Response(JSON.stringify({ Id: 99, Status: "Completed" }), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "status", "99"], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/Workflows/99");
      expect(capturedMethod).toBe("GET");
    });

    test("status outputs the workflow data", async () => {
      const workflowData = { Id: 99, Status: "Completed", Name: "Test" };
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(workflowData), { status: 200 });
      }) as typeof fetch;

      await createProgram().parseAsync(["workflows", "status", "99"], { from: "user" });

      const written = writeSpy.mock.calls.map((c) => c[0]).join("");
      expect(JSON.parse(written)).toEqual(workflowData);
    });
  });
});
