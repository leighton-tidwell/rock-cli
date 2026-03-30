import type { RockProfile } from "./config.ts";
import { buildQueryString, type ODataQuery } from "./utils/odata.ts";

export class RockClient {
  private baseUrl: string;
  private apiKey: string;
  dryRun: boolean = false;

  constructor(profile: RockProfile) {
    this.baseUrl = profile.url.replace(/\/+$/, "");
    this.apiKey = profile.apiKey;
  }

  private headers(): Record<string, string> {
    return {
      "authorization-token": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: ODataQuery
  ): Promise<T> {
    const qs = query ? buildQueryString(query) : "";
    const url = `${this.baseUrl}${path}${qs}`;

    if (this.dryRun) {
      const info: Record<string, unknown> = { method, url };
      if (body !== undefined) info.body = body;
      console.log(JSON.stringify(info, null, 2));
      return undefined as T;
    }

    const init: RequestInit = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `Rock API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`
      );
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  async get<T>(path: string, query?: ODataQuery): Promise<T> {
    return this.request<T>("GET", path, undefined, query);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  async put(path: string, body: unknown): Promise<void> {
    await this.request<void>("PUT", path, body);
  }

  async patch(path: string, body: unknown): Promise<void> {
    await this.request<void>("PATCH", path, body);
  }

  async delete(path: string): Promise<void> {
    await this.request<void>("DELETE", path);
  }
}
