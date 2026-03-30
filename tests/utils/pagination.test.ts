import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { paginate } from "../../src/utils/pagination.ts";
import { RockClient } from "../../src/client.ts";
import type { RockProfile } from "../../src/config.ts";

const testProfile: RockProfile = {
  url: "https://rock.example.com/api",
  apiKey: "test-key",
};

describe("paginate", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("single page of results", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify([{ Id: 1 }, { Id: 2 }]), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    // page size bigger than results = single page
    const results = await paginate<{ Id: number }>(client, "/People", {}, 100);
    expect(results).toEqual([{ Id: 1 }, { Id: 2 }]);
  });

  test("multi-page collects all results", async () => {
    let callCount = 0;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      callCount++;
      const url = input.toString();
      if (url.includes("skip=0") || !url.includes("skip")) {
        if (callCount === 1) {
          return new Response(JSON.stringify([{ Id: 1 }, { Id: 2 }]), { status: 200 });
        }
      }
      if (callCount === 2) {
        return new Response(JSON.stringify([{ Id: 3 }]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    const results = await paginate<{ Id: number }>(client, "/People", {}, 2);
    expect(results).toEqual([{ Id: 1 }, { Id: 2 }, { Id: 3 }]);
  });

  test("empty results returns empty array", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    const results = await paginate<{ Id: number }>(client, "/People");
    expect(results).toEqual([]);
  });
});
