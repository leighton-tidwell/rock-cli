import type { RockProfile } from "./config.ts";
import type { SearchQuery, SearchResult } from "./utils/search.ts";

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

  private modelPath(resource: string, ...segments: (string | number)[]): string {
    const parts = [`/api/v2/models/${resource}`, ...segments.map(String)];
    return parts.join("/");
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    if (this.dryRun) {
      const info: Record<string, unknown> = { method, url };
      if (body !== undefined) info.body = body;
      console.log(JSON.stringify(info, null, 2));
      return undefined as T;
    }
    const init: RequestInit = { method, headers: this.headers() };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await fetch(url, init);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Rock API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return response.json() as Promise<T>;
  }

  // ── V2 Model API Methods ──────────────────────────────────────────

  /** POST /api/v2/models/{resource}/search */
  async search<T>(resource: string, query?: SearchQuery): Promise<SearchResult<T>> {
    const path = this.modelPath(resource, "search");
    return this.request<SearchResult<T>>("POST", path, query ?? {});
  }

  /** GET /api/v2/models/{resource}/{id} */
  async getOne<T>(resource: string, id: string | number): Promise<T> {
    const path = this.modelPath(resource, id);
    return this.request<T>("GET", path);
  }

  /** POST /api/v2/models/{resource} */
  async create<T>(resource: string, body: unknown): Promise<T> {
    const path = this.modelPath(resource);
    return this.request<T>("POST", path, body);
  }

  /** PATCH /api/v2/models/{resource}/{id} */
  async update(resource: string, id: string | number, body: unknown): Promise<void> {
    const path = this.modelPath(resource, id);
    await this.request<void>("PATCH", path, body);
  }

  /** DELETE /api/v2/models/{resource}/{id} */
  async remove(resource: string, id: string | number): Promise<void> {
    const path = this.modelPath(resource, id);
    await this.request<void>("DELETE", path);
  }

  /** GET /api/v2/models/{resource}/{id}/attributevalues */
  async getAttributes<T>(resource: string, id: string | number): Promise<T> {
    const path = this.modelPath(resource, id, "attributevalues");
    return this.request<T>("GET", path);
  }

  /** PATCH /api/v2/models/{resource}/{id}/attributevalues */
  async updateAttributes(resource: string, id: string | number, body: unknown): Promise<void> {
    const path = this.modelPath(resource, id, "attributevalues");
    await this.request<void>("PATCH", path, body);
  }

  // ── Raw HTTP Methods (for non-standard endpoints) ─────────────────

  async get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
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
