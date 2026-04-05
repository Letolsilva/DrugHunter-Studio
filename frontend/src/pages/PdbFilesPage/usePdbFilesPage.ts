// pages/PdbFilesPage/usePdbFilesPage.ts
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { PdbFilesUseCase } from "../../data/usecases/pdb_files.usecase";
import type { PdbFileModel } from "../../domain/models/pdb_files.model";

type Fase = "carregando" | "ok" | "vazio" | "erro";

export interface UsePdbFilesPageReturn {
  fase: Fase;
  arquivos: PdbFileModel[];
  erroMsg: string;
  confirmandoExclusao: string | null;
  handleExcluir: (pdb_id: string) => void;
  confirmarExclusao: () => void;
  cancelarExclusao: () => void;
  handleAbrirVisualizador: (pdb_id: string) => void;
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
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(
    null,
  );

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

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const handleExcluir = useCallback((pdb_id: string) => {
    setConfirmandoExclusao(pdb_id);
  }, []);

  const confirmarExclusao = useCallback(() => {
    if (!confirmandoExclusao) return;
    const pdb_id = confirmandoExclusao;
    setConfirmandoExclusao(null);
    const token = localStorage.getItem("access_token") ?? "";
    pdbFilesUseCase
      .remover(pdb_id, token)
      .then(() => {
        setArquivos((prev) => {
          const nova = prev.filter((a) => a.pdb_id !== pdb_id);
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
    (pdb_id: string) => {
      navigate(`/visualizador/${pdb_id}`);
    },
    [navigate],
  );

  return {
    fase,
    arquivos,
    erroMsg,
    confirmandoExclusao,
    handleExcluir,
    confirmarExclusao,
    cancelarExclusao,
    handleAbrirVisualizador,
    handleLogout,
  };
}
