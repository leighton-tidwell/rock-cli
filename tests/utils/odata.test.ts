import { describe, test, expect } from "bun:test";
import { buildQueryString } from "../../src/utils/odata.ts";

describe("buildQueryString", () => {
  test("empty query returns empty string", () => {
    expect(buildQueryString({})).toBe("");
  });

  test("filter as Record maps to $filter with eq", () => {
    const qs = buildQueryString({ filter: { FirstName: "Ted", IsActive: true } });
    expect(qs).toContain("$filter=");
    expect(qs).toContain("FirstName eq 'Ted'");
    expect(qs).toContain("IsActive eq true");
    expect(qs).toContain(" and ");
  });

  test("filter as string passes through", () => {
    const qs = buildQueryString({ filter: "contains(FirstName,'Ted')" });
    expect(qs).toContain("$filter=contains(FirstName,'Ted')");
  });

  test("select joins with commas", () => {
    const qs = buildQueryString({ select: ["Id", "FirstName", "LastName"] });
    expect(qs).toBe("?$select=Id,FirstName,LastName");
  });

  test("expand joins with commas", () => {
    const qs = buildQueryString({ expand: ["PhoneNumbers", "GroupMembers"] });
    expect(qs).toBe("?$expand=PhoneNumbers,GroupMembers");
  });

  test("top and skip", () => {
    const qs = buildQueryString({ top: 10, skip: 20 });
    expect(qs).toContain("$top=10");
    expect(qs).toContain("$skip=20");
  });

  test("orderby", () => {
    const qs = buildQueryString({ orderby: "LastName desc" });
    expect(qs).toBe("?$orderby=LastName desc");
  });

  test("loadAttributes param", () => {
    const qs = buildQueryString({ loadAttributes: "simple" });
    expect(qs).toBe("?loadAttributes=simple");
  });

  test("combined params", () => {
    const qs = buildQueryString({
      filter: { IsActive: true },
      select: ["Id", "FirstName"],
      top: 5,
      orderby: "Id",
      loadAttributes: "expanded",
    });
    expect(qs).toContain("$filter=IsActive eq true");
    expect(qs).toContain("$select=Id,FirstName");
    expect(qs).toContain("$top=5");
    expect(qs).toContain("$orderby=Id");
    expect(qs).toContain("loadAttributes=expanded");
    expect(qs).toStartWith("?");
  });

  test("number filter values are not quoted", () => {
    const qs = buildQueryString({ filter: { CampusId: 1 } });
    expect(qs).toContain("CampusId eq 1");
    expect(qs).not.toContain("'1'");
  });
});
