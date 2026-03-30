import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { saveConfig } from "../../src/config.ts";
import type { RockConfig } from "../../src/config.ts";
import { makeGivingCommand } from "../../src/commands/giving.ts";
import { Command } from "commander";

const TEST_DIR = join(tmpdir(), "rock-cli-cmd-giving-test-" + Date.now());
const TEST_CONFIG_PATH = join(TEST_DIR, ".rockrc.json");

function setupProgram(): Command {
  const program = new Command();
  program.addCommand(makeGivingCommand());
  return program;
}

describe("giving command", () => {
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

  describe("transactions subcommand", () => {
    test("fetches transactions with person filter", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "transactions", "--person", "42"], { from: "user" });

      expect(capturedUrl).toContain("/api/FinancialTransactions");
      expect(capturedUrl).toContain("AuthorizedPersonAliasId eq 42");
    });

    test("fetches transactions with from and to date filters", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(
        ["giving", "transactions", "--from", "2025-01-01", "--to", "2025-12-31"],
        { from: "user" }
      );

      expect(capturedUrl).toContain("TransactionDateTime ge datetime'2025-01-01'");
      expect(capturedUrl).toContain("TransactionDateTime le datetime'2025-12-31'");
    });

    test("fetches transactions with account filter", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "transactions", "--account", "5"], { from: "user" });

      expect(capturedUrl).toContain("FinancialPaymentDetail/FinancialAccountId eq 5");
    });

    test("fetches transactions with top option", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "transactions", "--top", "10"], { from: "user" });

      expect(capturedUrl).toContain("$top=10");
    });

    test("combines multiple filters", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(
        ["giving", "transactions", "--person", "42", "--from", "2025-01-01", "--top", "5"],
        { from: "user" }
      );

      expect(capturedUrl).toContain("AuthorizedPersonAliasId eq 42");
      expect(capturedUrl).toContain("TransactionDateTime ge datetime'2025-01-01'");
      expect(capturedUrl).toContain("$top=5");
    });

    test("outputs transaction data", async () => {
      const txns = [{ Id: 1, TotalAmount: 100 }, { Id: 2, TotalAmount: 200 }];
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(txns), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "transactions"], { from: "user" });

      const outputStr = writeSpy.mock.calls.map((c: unknown[]) => c[0]).join("");
      const parsed = JSON.parse(outputStr);
      expect(parsed).toEqual(txns);
    });
  });

  describe("accounts subcommand", () => {
    test("fetches financial accounts", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([{ Id: 1, Name: "General Fund" }]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "accounts"], { from: "user" });

      expect(capturedUrl).toContain("/api/FinancialAccounts");
    });

    test("outputs accounts data", async () => {
      const accounts = [{ Id: 1, Name: "General Fund" }, { Id: 2, Name: "Missions" }];
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(accounts), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "accounts"], { from: "user" });

      const outputStr = writeSpy.mock.calls.map((c: unknown[]) => c[0]).join("");
      const parsed = JSON.parse(outputStr);
      expect(parsed).toEqual(accounts);
    });
  });

  describe("summary subcommand", () => {
    test("fetches transactions filtered by person and year", async () => {
      let capturedUrl = "";
      globalThis.fetch = mock(async (input: RequestInfo | URL) => {
        capturedUrl = input.toString();
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "summary", "--person", "42", "--year", "2025"], {
        from: "user",
      });

      expect(capturedUrl).toContain("/api/FinancialTransactions");
      expect(capturedUrl).toContain("AuthorizedPersonAliasId eq 42");
      expect(capturedUrl).toContain("TransactionDateTime ge datetime'2025-01-01'");
      expect(capturedUrl).toContain("TransactionDateTime le datetime'2025-12-31'");
    });

    test("calculates totals client-side", async () => {
      const txns = [
        { Id: 1, TotalAmount: 100.5 },
        { Id: 2, TotalAmount: 200.25 },
        { Id: 3, TotalAmount: 50.0 },
      ];
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify(txns), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      await program.parseAsync(["giving", "summary", "--person", "42", "--year", "2025"], {
        from: "user",
      });

      const outputStr = writeSpy.mock.calls.map((c: unknown[]) => c[0]).join("");
      const parsed = JSON.parse(outputStr);
      expect(parsed.totalAmount).toBe(350.75);
      expect(parsed.transactionCount).toBe(3);
      expect(parsed.person).toBe(42);
      expect(parsed.year).toBe(2025);
    });

    test("requires person and year options", async () => {
      globalThis.fetch = mock(async () => {
        return new Response(JSON.stringify([]), { status: 200 });
      }) as typeof fetch;

      const program = setupProgram();
      program.exitOverride();
      program.commands.forEach((c) => {
        c.exitOverride();
        c.commands.forEach((sc) => sc.exitOverride());
      });

      await expect(
        program.parseAsync(["giving", "summary"], { from: "user" })
      ).rejects.toThrow();
    });
  });
});
