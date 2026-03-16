// routes.tsx
import { Routes, Route, Navigate, type ReactNode } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage/AuthPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import type { SearchUseCase } from "./data/usecases/search.usecase";

interface RotaProtegidaProps {
  children: ReactNode;
}

function RotaProtegida({ children }: RotaProtegidaProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--bg)" }}
      >
        <span
          className="spinner"
          style={{ width: 32, height: 32, borderWidth: 3 }}
        />
        <span
          style={{
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          Carregando...
        </span>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
}

interface AppRoutesProps {
  searchUseCase: SearchUseCase;
}

export default function AppRoutes({ searchUseCase }: AppRoutesProps) {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          loading ? null : user ? (
            <Navigate to="/search" replace />
          ) : (
            <AuthPage />
          )
        }
      />
      <Route
        path="/search"
        element={
          <RotaProtegida>
            <SearchPage searchUseCase={searchUseCase} />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
