export interface ODataQuery {
  filter?: Record<string, unknown> | string;
  select?: string[];
  expand?: string[];
  top?: number;
  skip?: number;
  orderby?: string;
  loadAttributes?: "simple" | "expanded";
}

export function buildQueryString(query: ODataQuery): string {
  const params: string[] = [];

  if (query.filter !== undefined) {
    if (typeof query.filter === "string") {
      params.push(`$filter=${query.filter}`);
    } else {
      const clauses = Object.entries(query.filter).map(([key, value]) => {
        if (typeof value === "string") {
          return `${key} eq '${value}'`;
        }
        return `${key} eq ${value}`;
      });
      params.push(`$filter=${clauses.join(" and ")}`);
    }
  }

  if (query.select && query.select.length > 0) {
    params.push(`$select=${query.select.join(",")}`);
  }

  if (query.expand && query.expand.length > 0) {
    params.push(`$expand=${query.expand.join(",")}`);
  }

  if (query.top !== undefined) {
    params.push(`$top=${query.top}`);
  }

  if (query.skip !== undefined) {
    params.push(`$skip=${query.skip}`);
  }

  if (query.orderby !== undefined) {
    params.push(`$orderby=${query.orderby}`);
  }

  if (query.loadAttributes !== undefined) {
    params.push(`loadAttributes=${query.loadAttributes}`);
  }

  if (params.length === 0) return "";
  return "?" + params.join("&");
}
