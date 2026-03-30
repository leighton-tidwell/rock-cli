import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeCommCommand } from "../../src/commands/communication.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-comm-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function makeProgram(): Command {
  const program = new Command();
  program.addCommand(makeCommCommand());
  return program;
}

describe("comm command", () => {
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

  describe("send-sms", () => {
    test("POSTs to /api/Communications with SMS medium type", async () => {
      let capturedUrl: string | undefined;
      let capturedBody: any;
      let capturedMethod: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method;
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(
        ["comm", "send-sms", "--to", "123", "--from", "+15551234567", "--body", "Hello there"],
        { from: "user" }
      );

      expect(capturedUrl).toBe("https://rock.example.com/api/Communications");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody.CommunicationMediumEntityTypeId).toBe(2); // SMS
      expect(capturedBody.SenderPersonAliasId).toBeUndefined();
      expect(capturedBody.Recipients).toEqual([{ PersonAliasId: 123 }]);
      expect(capturedBody.SMSFromDefinedValueId).toBe("+15551234567");
      expect(capturedBody.Message).toBe("Hello there");
    });

    test("outputs the created communication", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ Id: 42 }), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(
        ["comm", "send-sms", "--to", "123", "--from", "+15551234567", "--body", "Hi"],
        { from: "user" }
      );

      const written = writeSpy.mock.calls.map((c: any) => c[0]).join("");
      expect(written).toContain("42");
    });
  });

  describe("send-email", () => {
    test("POSTs to /api/Communications with Email medium type", async () => {
      let capturedUrl: string | undefined;
      let capturedBody: any;
      let capturedMethod: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method;
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ Id: 99 }), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(
        ["comm", "send-email", "--to", "456", "--template", "10", "--subject", "Test Subject", "--body", "Email body"],
        { from: "user" }
      );

      expect(capturedUrl).toBe("https://rock.example.com/api/Communications");
      expect(capturedMethod).toBe("POST");
      expect(capturedBody.CommunicationMediumEntityTypeId).toBe(1); // Email
      expect(capturedBody.Recipients).toEqual([{ PersonAliasId: 456 }]);
      expect(capturedBody.CommunicationTemplateId).toBe(10);
      expect(capturedBody.Subject).toBe("Test Subject");
      expect(capturedBody.Message).toBe("Email body");
    });

    test("outputs the created communication", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify({ Id: 99 }), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(
        ["comm", "send-email", "--to", "456", "--template", "10", "--subject", "Sub", "--body", "Body"],
        { from: "user" }
      );

      const written = writeSpy.mock.calls.map((c: any) => c[0]).join("");
      expect(written).toContain("99");
    });
  });

  describe("templates", () => {
    test("GETs /api/CommunicationTemplates with no filter when no type given", async () => {
      let capturedUrl: string | undefined;
      let capturedMethod: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = input.toString();
        capturedMethod = init?.method;
        return new Response(JSON.stringify([{ Id: 1, Name: "Welcome" }]), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(["comm", "templates"], { from: "user" });

      expect(capturedUrl).toBe("https://rock.example.com/api/CommunicationTemplates");
      expect(capturedMethod).toBe("GET");
    });

    test("GETs with filter when --type sms is given", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(["comm", "templates", "--type", "sms"], { from: "user" });

      expect(capturedUrl).toContain("CommunicationTemplates");
      expect(capturedUrl).toContain("$filter=");
      expect(capturedUrl).toContain("sms");
    });

    test("GETs with filter when --type email is given", async () => {
      let capturedUrl: string | undefined;
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(["comm", "templates", "--type", "email"], { from: "user" });

      expect(capturedUrl).toContain("CommunicationTemplates");
      expect(capturedUrl).toContain("$filter=");
      expect(capturedUrl).toContain("email");
    });

    test("outputs the templates list", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify([{ Id: 1, Name: "Welcome" }]), { status: 200 });
      }) as typeof fetch;

      await makeProgram().parseAsync(["comm", "templates"], { from: "user" });

      const written = writeSpy.mock.calls.map((c: any) => c[0]).join("");
      expect(written).toContain("Welcome");
    });
  });
});
