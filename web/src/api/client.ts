import type {
  ArbreResponse,
  PersonneDetail,
  RafraichirResponse,
  RechercheResponse,
  StatusResponse,
} from "../types/api";

const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
})();

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  status: () => request<StatusResponse>("/api/status"),

  rafraichir: (force = false) =>
    request<RafraichirResponse>(`/api/rafraichir?force=${force}`, {
      method: "POST",
    }),

  personne: (id: string) =>
    request<PersonneDetail>(`/api/personnes/${encodeURIComponent(id)}`),

  arbre: (id: string, ancetres = 4, descendants = 2) =>
    request<ArbreResponse>(
      `/api/personnes/${encodeURIComponent(id)}/arbre?ancetres=${ancetres}&descendants=${descendants}`,
    ),

  recherche: (q: string, page = 1, limit = 20) =>
    request<RechercheResponse>(
      `/api/recherche?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`,
    ),
};

export { ApiError };
