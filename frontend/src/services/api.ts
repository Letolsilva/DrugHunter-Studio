// services/api.js
const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

async function refreshTokens() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) throw new Error("Sem refresh token");

  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh inválido");

  const tokens = await res.json();
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  if (tokens.refresh_token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  }
  return tokens.access_token;
}

interface FetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

async function fetchWithAuth(path: string, options: FetchOptions = {}) {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    try {
      const newToken = await refreshTokens();
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`/api${path}`, { ...options, headers });
    } catch {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      window.location.href = "/";
      return;
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Erro ${res.status}`);
  }
  return res.json();
}

// ── Auth endpoints ─────────────────────────────────────────
export const auth = {
  me: () => fetchWithAuth("/auth/me"),
  historico: () => fetchWithAuth("/auth/me/historico"),
  alterarSenha: (senhaAtual: string, novaSenha: string) =>
    fetchWithAuth("/auth/me/senha", {
      method: "PUT",
      body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
    }),
};

// ── Admin endpoints ────────────────────────────────────────
export const admin = {
  stats: () => fetchWithAuth("/admin/stats"),
  config: () => fetchWithAuth("/admin/config"),
  setConfig: (chave: string, valor: unknown) =>
    fetchWithAuth(`/admin/config/${chave}`, {
      method: "PUT",
      body: JSON.stringify({ valor }),
    }),
  limparCache: () => fetchWithAuth("/admin/cache/limpar", { method: "POST" }),
  proximasExpirar: () => fetchWithAuth("/admin/cache/proximas-expirar"),
  organismos: () => fetchWithAuth("/admin/organismos"),
  listarUsuarios: () => fetchWithAuth("/auth/admin/usuarios"),
  toggleUsuario: (id: number | string) =>
    fetchWithAuth(`/auth/admin/usuarios/${id}/toggle-ativo`, { method: "PUT" }),
};

// ── Search endpoints ───────────────────────────────────────
export const search = {
  organismos: () => fetchWithAuth("/search/organismos"),
  csv: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchWithAuth(`/search/csv${qs ? "?" + qs : ""}`);
  },
};

// ── Download endpoints ─────────────────────────────────────
export const download = {
  pdbUrl: (pdbId: string) => `/api/download/pdb/${pdbId}`,
};
