// pages/HomePage/useHomePage.ts
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { HomeUseCase } from "../../data/usecases/home.usecase";
import type { HomeStatusModel } from "../../domain/models/home.model";

export interface UseHomePageReturn {
  userName: string;
  status: HomeStatusModel | null;
  loading: boolean;
  handleLogout: () => void;
}

export function useHomePage(homeUseCase: HomeUseCase): UseHomePageReturn {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<HomeStatusModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    if (!token) { setLoading(false); return; }
    homeUseCase
      .getStatus(token)
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [homeUseCase]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  return {
    userName: user?.username ?? user?.email ?? "pesquisadora",
    status,
    loading,
    handleLogout,
  };
}
