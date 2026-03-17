// pages/HistoryDashboardPage/useHistoryDashboardPage.ts
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";
import type { DashboardUseCase } from "../../data/usecases/dashboard.usecase";
import type { SearchHistoryDetail } from "../../domain/models/history.model";
import {
  useDashboard,
  type UseDashboardReturn,
} from "../../hooks/useDashboard";

type DashboardFase = "carregando" | "detalhe" | "erro";

export interface UseHistoryDashboardPageReturn {
  fase: DashboardFase;
  detalhe: SearchHistoryDetail | null;
  erroMsg: string;
  voltarLista: () => void;
  novaBusca: () => void;
  handleLogout: () => void;
  dashboard: UseDashboardReturn;
}

export function useHistoryDashboardPage(
  historyUseCase: HistoryUseCase,
  dashboardUseCase: DashboardUseCase,
): UseHistoryDashboardPageReturn {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [fase, setFase] = useState<DashboardFase>("carregando");
  const [detalhe, setDetalhe] = useState<SearchHistoryDetail | null>(null);
  const [erroMsg, setErroMsg] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const voltarLista = () => {
    navigate("/historico");
  };

  const novaBusca = () => {
    navigate("/search");
  };

  const dashboard = useDashboard(detalhe?.proteinas ?? [], dashboardUseCase);

  useEffect(() => {
    const numId = Number(id);
    if (!id || isNaN(numId)) {
      setErroMsg("ID de busca inválido.");
      setFase("erro");
      return;
    }
    const token = localStorage.getItem("access_token") ?? "";
    setFase("carregando");
    historyUseCase
      .getDetail(numId, token)
      .then((d) => {
        setDetalhe(d);
        setFase("detalhe");
      })
      .catch(() => {
        setErroMsg("Não foi possível carregar os detalhes da busca.");
        setFase("erro");
      });
  }, [id, historyUseCase]);

  return {
    fase,
    detalhe,
    erroMsg,
    voltarLista,
    novaBusca,
    handleLogout,
    dashboard,
  };
}
