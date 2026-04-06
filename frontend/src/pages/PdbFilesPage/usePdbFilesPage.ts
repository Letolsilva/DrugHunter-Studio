// pages/PdbFilesPage/usePdbFilesPage.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { PdbFilesUseCase } from "../../data/usecases/pdb_files.usecase";
import type { PdbFileModel } from "../../domain/models/pdb_files.model";

type Fase = "carregando" | "ok" | "vazio" | "erro";
export type FiltroFormato = "todos" | "legacy" | "cif";

export interface ConfirmandoExclusao {
  pdb_id: string;
  formato: "legacy" | "cif";
}

export interface UsePdbFilesPageReturn {
  fase: Fase;
  arquivos: PdbFileModel[];
  arquivosFiltrados: PdbFileModel[];
  erroMsg: string;
  confirmandoExclusao: ConfirmandoExclusao | null;
  filtroFormato: FiltroFormato;
  setFiltroFormato: (v: FiltroFormato) => void;
  handleExcluir: (pdb_id: string, formato: "legacy" | "cif") => void;
  confirmarExclusao: () => void;
  cancelarExclusao: () => void;
  handleAbrirVisualizador: (pdb_id: string, formato: "legacy" | "cif") => void;
  handleLogout: () => void;
}

export function usePdbFilesPage(
  pdbFilesUseCase: PdbFilesUseCase,
): UsePdbFilesPageReturn {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [fase, setFase] = useState<Fase>("carregando");
  const [arquivos, setArquivos] = useState<PdbFileModel[]>([]);
  const [erroMsg, setErroMsg] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] =
    useState<ConfirmandoExclusao | null>(null);
  const [filtroFormato, setFiltroFormato] = useState<FiltroFormato>("todos");

  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    pdbFilesUseCase
      .listar(token)
      .then((lista) => {
        setArquivos(lista);
        setFase(lista.length === 0 ? "vazio" : "ok");
      })
      .catch((err: Error) => {
        setErroMsg(err.message);
        setFase("erro");
      });
  }, [pdbFilesUseCase]);

  const arquivosFiltrados = useMemo(
    () =>
      filtroFormato === "todos"
        ? arquivos
        : arquivos.filter((a) => a.formato === filtroFormato),
    [arquivos, filtroFormato],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const handleExcluir = useCallback(
    (pdb_id: string, formato: "legacy" | "cif") => {
      setConfirmandoExclusao({ pdb_id, formato });
    },
    [],
  );

  const confirmarExclusao = useCallback(() => {
    if (!confirmandoExclusao) return;
    const { pdb_id, formato } = confirmandoExclusao;
    setConfirmandoExclusao(null);
    const token = localStorage.getItem("access_token") ?? "";
    pdbFilesUseCase
      .remover(pdb_id, formato, token)
      .then(() => {
        setArquivos((prev) => {
          const nova = prev.filter(
            (a) => !(a.pdb_id === pdb_id && a.formato === formato),
          );
          setFase(nova.length === 0 ? "vazio" : "ok");
          return nova;
        });
      })
      .catch((err: Error) => {
        setErroMsg(err.message);
        setFase("erro");
      });
  }, [confirmandoExclusao, pdbFilesUseCase]);

  const cancelarExclusao = useCallback(() => {
    setConfirmandoExclusao(null);
  }, []);

  const handleAbrirVisualizador = useCallback(
    (pdb_id: string, formato: "legacy" | "cif") => {
      if (formato === "cif") {
        navigate(`/visualizador-cif/${pdb_id}`);
      } else {
        navigate(`/visualizador/${pdb_id}`);
      }
    },
    [navigate],
  );

  return {
    fase,
    arquivos,
    arquivosFiltrados,
    erroMsg,
    confirmandoExclusao,
    filtroFormato,
    setFiltroFormato,
    handleExcluir,
    confirmarExclusao,
    cancelarExclusao,
    handleAbrirVisualizador,
    handleLogout,
  };
}
