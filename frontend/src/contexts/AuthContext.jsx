// contexts/AuthContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

async function fetchMe(token) {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Token inválido");
  return res.json();
}

async function fetchRefresh(refreshToken) {
  const res = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error("Refresh inválido");
  return res.json();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const carregarUsuario = useCallback(async () => {
    const access = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!access && !refresh) {
      setLoading(false);
      return;
    }

    try {
      if (access) {
        const userData = await fetchMe(access);
        setUser(userData);
      } else {
        throw new Error("Sem access token");
      }
    } catch {
      // Tenta renovar com refresh token
      if (refresh) {
        try {
          const tokens = await fetchRefresh(refresh);
          localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
          if (tokens.refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
          }
          const userData = await fetchMe(tokens.access_token);
          setUser(userData);
        } catch {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarUsuario();
  }, [carregarUsuario]);

  const login = async (username, password) => {
    const body = new URLSearchParams({ username, password });
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Credenciais inválidas.");
    }
    const tokens = await res.json();
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
    const userData = await fetchMe(tokens.access_token);
    setUser(userData);
  };

  const register = async (email, username, password) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Erro ao criar conta.");
    }
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
