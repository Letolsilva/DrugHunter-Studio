// pages/HistoryPage/useHistoryPage.ts
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";
import type {
  SearchHistoryItem,
  SearchHistoryDetail,
} from "../../domain/models/history.model";

type HistoryFase = "lista" | "carregando" | "detalhe" | "erro";

export interface UseHistoryPageReturn {
  fase: HistoryFase;
  historico: SearchHistoryItem[];
  detalhe: SearchHistoryDetail | null;
  erroMsg: string;
  carregando: boolean;
  abrirDetalhe: (item: SearchHistoryItem) => void;
  voltarLista: () => void;
  handleLogout: () => void;
}

export function useHistoryPage(
  historyUseCase: HistoryUseCase,
): UseHistoryPageReturn {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [fase, setFase] = useState<HistoryFase>("lista");
  const [historico, setHistorico] = useState<SearchHistoryItem[]>([]);
  const [detalhe, setDetalhe] = useState<SearchHistoryDetail | null>(null);
  const [erroMsg, setErroMsg] = useState("");
  const [carregando, setCarregando] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    setCarregando(true);
    historyUseCase
      .getHistory(token)
      .then((items) => setHistorico(items))
      .catch(() => {
        setErroMsg("Não foi possível carregar o histórico.");
        setFase("erro");
      })
      .finally(() => setCarregando(false));
  }, [historyUseCase]);

  const abrirDetalhe = useCallback(
    (item: SearchHistoryItem) => {
      setFase("carregando");
      const token = localStorage.getItem("access_token") ?? "";
      historyUseCase
        .getDetail(item.id, token)
        .then((d) => {
          setDetalhe(d);
          setFase("detalhe");
        })
        .catch(() => {
          setErroMsg("Não foi possível carregar os detalhes da busca.");
          setFase("erro");
        });
    },
    [historyUseCase],
  );

  const voltarLista = useCallback(() => {
    setDetalhe(null);
    setFase("lista");
  }, []);

  return {
    fase,
    historico,
    detalhe,
    erroMsg,
    carregando,
    abrirDetalhe,
    voltarLista,
    handleLogout,
  };
}
