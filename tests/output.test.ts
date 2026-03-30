import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { output } from "../src/output.ts";

describe("output", () => {
  let writeSpy: ReturnType<typeof spyOn>;
  let written: string;

  beforeEach(() => {
    written = "";
    writeSpy = spyOn(process.stdout, "write").mockImplementation((chunk: any) => {
      written += chunk.toString();
      return true;
    });
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  test("json mode outputs indented JSON", () => {
    output({ Id: 1, Name: "Ted" }, { json: true });
    expect(written).toBe(JSON.stringify({ Id: 1, Name: "Ted" }, null, 2) + "\n");
  });

  test("raw mode outputs compact JSON", () => {
    output({ Id: 1 }, { raw: true });
    expect(written).toBe(JSON.stringify({ Id: 1 }) + "\n");
  });

  test("table mode with object shows key-value pairs", () => {
    output({ Id: 1, Name: "Ted" }, { table: true });
    expect(written).toContain("Id");
    expect(written).toContain("1");
    expect(written).toContain("Name");
    expect(written).toContain("Ted");
  });

  test("table mode with array formats rows", () => {
    output([{ Id: 1, Name: "Ted" }, { Id: 2, Name: "Bob" }], { table: true });
    expect(written).toContain("Id");
    expect(written).toContain("Name");
    expect(written).toContain("Ted");
    expect(written).toContain("Bob");
  });

  test("defaults to json when no flag", () => {
    output({ Id: 1 }, {});
    expect(written).toBe(JSON.stringify({ Id: 1 }, null, 2) + "\n");
  });
});
