import type { RockClient } from "../client.ts";
import type { ODataQuery } from "./odata.ts";

export async function paginate<T>(
  client: RockClient,
  path: string,
  query?: ODataQuery,
  pageSize: number = 100
): Promise<T[]> {
  const all: T[] = [];
  let skip = 0;

  while (true) {
    const pageQuery: ODataQuery = {
      ...query,
      top: pageSize,
      skip,
    };
    const results = await client.get<T[]>(path, pageQuery);
    if (!results || results.length === 0) break;
    all.push(...results);
    if (results.length < pageSize) break;
    skip += pageSize;
  }

  return all;
}
