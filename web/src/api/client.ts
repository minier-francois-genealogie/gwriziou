import type {
  AccountRequestPayload,
  AccountRequestResponse,
  AnalyseStatsResponse,
  ArbreResponse,
  AuthMeResponse,
  CompteListResponse,
  DirigeantsFranceListResponse,
  DirigeantsFranceStatsResponse,
  EvolutionNomsResponse,
  FaitsHistoriquesListResponse,
  FaitsHistoriquesStatsResponse,
  GeolocResponse,
  HashPasswordResponse,
  PersonneDetail,
  ProfessionMappingListResponse,
  ProfessionMappingLigne,
  ProfessionsNuageResponse,
  RafraichirResponse,
  RechercheResponse,
  StatusResponse,
  WarningsListResponse,
  WarningsStatsResponse,
} from "../types/api";

const API_BASE = (() => {
  const raw = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // Hostname complet (ex. api.example.com) ou localhost:8000
  if (raw.includes(".") || raw.includes(":")) return `https://${raw}`;
  // Nom de service Render seul (ex. gwriziou-api via fromService)
  return `https://${raw}.onrender.com`;
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
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      API_BASE
        ? `Impossible de joindre l'API (${API_BASE})`
        : "Impossible de joindre l'API (VITE_API_URL non configuré)",
      0,
    );
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string | { msg: string }[] };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        detail = body.detail[0].msg;
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  authMe: () => request<AuthMeResponse>("/api/auth/me"),

  authLogin: (email: string, password: string) =>
    request<AuthMeResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  authLogout: () =>
    request<{ ok: boolean }>("/api/auth/logout", {
      method: "POST",
    }),

  authRequestAccount: (payload: AccountRequestPayload) =>
    request<AccountRequestResponse>("/api/auth/request-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

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

  warningsStats: (ancre: string, ancetres: number, descendants: number) =>
    request<WarningsStatsResponse>(
      `/api/warnings/stats?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}`,
    ),

  warnings: (
    ancre: string,
    ancetres: number,
    descendants: number,
    zone = false,
  ) =>
    request<WarningsListResponse>(
      `/api/warnings?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}&zone=${zone}`,
    ),

  faitsHistoriquesStats: (ancre: string, ancetres: number, descendants: number) =>
    request<FaitsHistoriquesStatsResponse>(
      `/api/faits-historiques/stats?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}`,
    ),

  faitsHistoriques: (
    ancre: string,
    ancetres: number,
    descendants: number,
    zone = false,
  ) =>
    request<FaitsHistoriquesListResponse>(
      `/api/faits-historiques?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}&zone=${zone}`,
    ),

  dirigeantsFranceStats: (ancre: string, ancetres: number, descendants: number) =>
    request<DirigeantsFranceStatsResponse>(
      `/api/dirigeants-france/stats?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}`,
    ),

  dirigeantsFrance: (
    ancre: string,
    ancetres: number,
    descendants: number,
    zone = false,
  ) =>
    request<DirigeantsFranceListResponse>(
      `/api/dirigeants-france?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}&zone=${zone}`,
    ),

  geoloc: (annee: number) =>
    request<GeolocResponse>(`/api/geoloc?annee=${annee}`),

  analyseStats: (ancre: string, ancetres: number, descendants: number, zone = true) =>
    request<AnalyseStatsResponse>(
      `/api/analyse/stats?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}&zone=${zone}`,
    ),

  analyseProfessions: (ancre: string, ancetres: number, descendants: number, zone = true) =>
    request<ProfessionsNuageResponse>(
      `/api/analyse/professions?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}&zone=${zone}`,
    ),

  analyseNoms: (ancre: string, ancetres: number, descendants: number, zone = true) =>
    request<EvolutionNomsResponse>(
      `/api/analyse/noms?ancre=${encodeURIComponent(ancre)}&ancetres=${ancetres}&descendants=${descendants}&zone=${zone}`,
    ),

  gestionProfessions: () =>
    request<ProfessionMappingListResponse>("/api/gestion/professions"),

  gestionProfessionUpdate: (profession_brute: string, libelle_nuage: string) =>
    request<ProfessionMappingLigne>("/api/gestion/professions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profession_brute, libelle_nuage }),
    }),

  gestionProfessionReset: (profession_brute: string) =>
    request<{ ok: boolean }>(
      `/api/gestion/professions?profession_brute=${encodeURIComponent(profession_brute)}`,
      { method: "DELETE" },
    ),

  adminComptes: () => request<CompteListResponse>("/api/admin/comptes"),

  adminHashPassword: (password: string) =>
    request<HashPasswordResponse>("/api/admin/hash-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),
};

export { ApiError };
