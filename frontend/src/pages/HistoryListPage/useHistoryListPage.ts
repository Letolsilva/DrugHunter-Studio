// pages/HistoryListPage/useHistoryListPage.ts
import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";
import type { SearchHistoryItem } from "../../domain/models/history.model";

const POR_PAGINA = 20;

type ListFase = "lista" | "carregando" | "erro";

export interface UseHistoryListPageReturn {
  fase: ListFase;
  historico: SearchHistoryItem[];
  erroMsg: string;
  abrirDetalhe: (item: SearchHistoryItem) => void;
  deletarItem: (id: number) => void;
  handleLogout: () => void;
  pagina: number;
  paginas: number;
  grupos: Record<string, SearchHistoryItem[]>;
  setPagina: Dispatch<SetStateAction<number>>;
}

export function useHistoryListPage(
  historyUseCase: HistoryUseCase,
): UseHistoryListPageReturn {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [fase, setFase] = useState<ListFase>("carregando");
  const [historico, setHistorico] = useState<SearchHistoryItem[]>([]);
  const [erroMsg, setErroMsg] = useState("");
  const [pagina, setPagina] = useState(1);

  const paginas = Math.ceil(historico.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const itensPagina = historico.slice(inicio, inicio + POR_PAGINA);
  const grupos: Record<string, SearchHistoryItem[]> = {};
  itensPagina.forEach((item) => {
    if (!grupos[item.data_local]) grupos[item.data_local] = [];
    grupos[item.data_local].push(item);
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    setFase("carregando");
    historyUseCase
      .getHistory(token)
      .then((items) => {
        setHistorico(items);
        setFase("lista");
      })
      .catch(() => {
        setErroMsg("Não foi possível carregar o histórico.");
        setFase("erro");
      });
  }, [historyUseCase]);

  const abrirDetalhe = (item: SearchHistoryItem) => {
    navigate(`/historico/${item.id}`);
  };

  const deletarItem = (id: number) => {
    const token = localStorage.getItem("access_token") ?? "";
    historyUseCase
      .deleteItem(id, token)
      .then(() => setHistorico((prev) => prev.filter((i) => i.id !== id)))
      .catch(() => {});
  };

  return {
    fase,
    historico,
    erroMsg,
    abrirDetalhe,
    deletarItem,
    handleLogout,
    pagina,
    paginas,
    grupos,
    setPagina,
  };
}
