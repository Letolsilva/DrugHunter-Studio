// contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { AuthUseCase } from "../data/usecases/auth.usecase";
import { HTTPClient } from "../infra/http/httpClient";
import type { UserModel } from "../domain/models/auth.model";
import type { IAuthUseCase } from "../domain/interfaces/auth.interface";

interface AuthContextValue {
  user: UserModel | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
}

interface AuthProviderProps {
  children: ReactNode;
  authUseCase?: IAuthUseCase;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

const _defaultAuthUseCase = new AuthUseCase(new HTTPClient());

export function AuthProvider({
  children,
  authUseCase = _defaultAuthUseCase,
}: AuthProviderProps) {
  const [user, setUser] = useState<UserModel | null>(null);
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
        const userData = await authUseCase.fetchMe(access);
        setUser(userData);
      } else {
        throw new Error("Sem access token");
      }
    } catch {
      if (refresh) {
        try {
          const tokens = await authUseCase.refreshToken(refresh);
          localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
          if (tokens.refresh_token) {
            localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
          }
          const userData = await authUseCase.fetchMe(tokens.access_token);
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

  const login = async (username: string, password: string): Promise<void> => {
    const tokens = await authUseCase.login(username, password);
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }
    const userData = await authUseCase.fetchMe(tokens.access_token);
    setUser(userData);
  };

  const register = async (
    email: string,
    username: string,
    password: string,
  ): Promise<void> => {
    await authUseCase.register(email, username, password);
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
