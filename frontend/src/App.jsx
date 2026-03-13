// App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import SearchPage from "./pages/SearchPage";

function RotaProtegida({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          background: "var(--bg)",
        }}
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

  return user ? children : <Navigate to="/" replace />;
}

export default function App() {
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
            <SearchPage />
          </RotaProtegida>
        }
      />
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
