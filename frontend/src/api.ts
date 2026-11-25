export type User = {
  id: string;
  workspace_id: string;
  username: string;
  role: "admin" | "editor" | "viewer";
};
export type Integration = {
  id: string;
  label: string;
  provider: string;
  model: string;
  configured: boolean;
  historical_probe: { passed: boolean; tested_at: string | null } | null;
};
export type IntegrationStatus = {
  integrations: Integration[];
  bulk_enabled: boolean;
  note: string;
};

export const SESSION_EXPIRED = "mediaatlas:session-expired";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.method && !["GET", "HEAD", "OPTIONS"].includes(init.method)) {
    const csrf = document.cookie
      .split("; ")
      .find((item) => item.startsWith("atlas_csrf="))
      ?.split("=")
      .slice(1)
      .join("=");
    if (csrf) headers.set("X-CSRF-Token", decodeURIComponent(csrf));
  }
  const response = await fetch("/api/v1" + path, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login") {
      window.dispatchEvent(new Event(SESSION_EXPIRED));
    }
    throw new ApiError(
      response.status,
      data.message || "服务暂不可用，请稍后重试",
    );
  }
  return data as T;
}
