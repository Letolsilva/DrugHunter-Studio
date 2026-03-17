// routes.tsx
import { Routes, Route, Navigate, type ReactNode } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage/AuthPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import HistoryListPage from "./pages/HistoryListPage/HistoryListPage";
import HistoryDashboardPage from "./pages/HistoryDashboardPage/HistoryDashboardPage";
import type { SearchUseCase } from "./data/usecases/search.usecase";
import type { HistoryUseCase } from "./data/usecases/history.usecase";

interface RotaProtegidaProps {
  children: ReactNode;
}

function RotaProtegida({ children }: RotaProtegidaProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "#0a0e1a" }}
      >
        <span
          className="spinner"
          style={{ width: 32, height: 32, borderWidth: 3 }}
        />
        <span
          style={{
            color: "#4a6080",
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
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
  historyUseCase: HistoryUseCase;
}

export default function AppRoutes({
  searchUseCase,
  historyUseCase,
}: AppRoutesProps) {
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
      <Route
        path="/historico"
        element={
          <RotaProtegida>
            <HistoryListPage historyUseCase={historyUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/historico/:id"
        element={
          <RotaProtegida>
            <HistoryDashboardPage historyUseCase={historyUseCase} />
          </RotaProtegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
