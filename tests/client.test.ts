import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { RockClient } from "../src/client.ts";
import type { RockProfile } from "../src/config.ts";

const testProfile: RockProfile = {
  url: "https://rock.example.com/api",
  apiKey: "test-api-key-123",
};

describe("RockClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("sets authorization-token header", async () => {
    let capturedHeaders: Headers | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.get("/api/People");
    expect(capturedHeaders?.get("authorization-token")).toBe("test-api-key-123");
  });

  test("joins profile URL and path", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.get("/People");
    expect(capturedUrl).toBe("https://rock.example.com/api/People");
  });

  test("appends OData query string", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify([]), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.get("/People", { top: 10, select: ["Id", "FirstName"] });
    expect(capturedUrl).toContain("$top=10");
    expect(capturedUrl).toContain("$select=Id,FirstName");
  });

  test("throws on non-2xx response", async () => {
    globalThis.fetch = mock(async () => {
      return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    expect(client.get("/People/999999")).rejects.toThrow("404");
  });

  test("GET method uses GET", async () => {
    let capturedMethod: string | undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedMethod = init?.method;
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.get("/People");
    expect(capturedMethod).toBe("GET");
  });

  test("POST sends body as JSON", async () => {
    let capturedBody: string | undefined;
    let capturedMethod: string | undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = init?.body as string;
      capturedMethod = init?.method;
      return new Response(JSON.stringify({ Id: 1 }), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.post("/People", { FirstName: "Ted" });
    expect(capturedMethod).toBe("POST");
    expect(JSON.parse(capturedBody!)).toEqual({ FirstName: "Ted" });
  });

  test("PUT sends body", async () => {
    let capturedMethod: string | undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedMethod = init?.method;
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.put("/People/1", { FirstName: "Ted" });
    expect(capturedMethod).toBe("PUT");
  });

  test("PATCH sends body", async () => {
    let capturedMethod: string | undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedMethod = init?.method;
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.patch("/People/1", { FirstName: "Ted" });
    expect(capturedMethod).toBe("PATCH");
  });

  test("DELETE method", async () => {
    let capturedMethod: string | undefined;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedMethod = init?.method;
      return new Response(null, { status: 204 });
    }) as typeof fetch;

    const client = new RockClient(testProfile);
    await client.delete("/People/1");
    expect(capturedMethod).toBe("DELETE");
  });

  test("handles trailing slash on base URL", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      capturedUrl = input.toString();
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = new RockClient({ url: "https://rock.example.com/api/", apiKey: "key" });
    await client.get("/People");
    expect(capturedUrl).toBe("https://rock.example.com/api/People");
  });
});
