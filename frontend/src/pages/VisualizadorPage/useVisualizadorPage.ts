// pages/VisualizadorPage/useVisualizadorPage.ts
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useVisualizador } from "../../contexts/VisualizadorContext";
import type { VisualizadorUseCase } from "../../data/usecases/visualizador.usecase";
import type { PdbArvore } from "../../domain/models/visualizador.model";

type Fase = "carregando" | "ok" | "erro";
type FiltroTipo = "ATOM" | "HETATM" | "AMBOS";

export interface UseVisualizadorPageReturn {
  fase: Fase;
  arvore: PdbArvore | null;
  erroMsg: string;
  filtroTipo: FiltroTipo;
  setFiltroTipo: (v: FiltroTipo) => void;
  filtroBusca: string;
  setFiltroBusca: (v: string) => void;
  linhasRaw: string[];
  tituloRaw: string;
  carregandoRaw: boolean;
  carregarLinhas: (
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
  ) => void;
  fecharRaw: () => void;
  handleVoltar: () => void;
  handleLogout: () => void;
  gerarCsv: () => void; // mantido para compatibilidade — implementado em GlobalAccumulatedPanel
  // do context
  selecionados: ReturnType<typeof useVisualizador>["selecionados"];
  isSelecionada: ReturnType<typeof useVisualizador>["isSelecionada"];
  toggleFolha: ReturnType<typeof useVisualizador>["toggleFolha"];
  adicionarFolha: ReturnType<typeof useVisualizador>["adicionarFolha"];
  removerFolha: ReturnType<typeof useVisualizador>["removerFolha"];
  limparTudo: ReturnType<typeof useVisualizador>["limparTudo"];
  limparPdb: ReturnType<typeof useVisualizador>["limparPdb"];
}

export function useVisualizadorPage(
  visualizadorUseCase: VisualizadorUseCase,
): UseVisualizadorPageReturn {
  const { pdb_id } = useParams<{ pdb_id: string }>();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const ctx = useVisualizador();

  const [fase, setFase] = useState<Fase>("carregando");
  const [arvore, setArvore] = useState<PdbArvore | null>(null);
  const [erroMsg, setErroMsg] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("HETATM");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [linhasRaw, setLinhasRaw] = useState<string[]>([]);
  const [tituloRaw, setTituloRaw] = useState("");
  const [carregandoRaw, setCarregandoRaw] = useState(false);

  useEffect(() => {
    if (!pdb_id) return;
    const token = localStorage.getItem("access_token") ?? "";
    setFase("carregando");
    visualizadorUseCase
      .getArvore(pdb_id, token)
      .then((data) => {
        setArvore(data);
        ctx.setOrganismo(data.organismo);
        setFase("ok");
      })
      .catch((err: Error) => {
        setErroMsg(err.message);
        setFase("erro");
      });
  }, [pdb_id, visualizadorUseCase]);

  const carregarLinhas = useCallback(
    (tipo: string, resname: string, chain: string, resnum: string) => {
      if (!pdb_id) return;
      const token = localStorage.getItem("access_token") ?? "";
      setCarregandoRaw(true);
      setTituloRaw(`${tipo} · ${resname} · Cadeia ${chain} · Res ${resnum}`);
      visualizadorUseCase
        .getLinhasGrupo(pdb_id, tipo, resname, chain, resnum, token)
        .then((linhas) => {
          setLinhasRaw(linhas);
          setCarregandoRaw(false);
        })
        .catch(() => {
          setLinhasRaw([]);
          setCarregandoRaw(false);
        });
    },
    [pdb_id, visualizadorUseCase],
  );

  const fecharRaw = useCallback(() => {
    setLinhasRaw([]);
    setTituloRaw("");
  }, []);

  const handleVoltar = useCallback(() => {
    navigate("/meus-pdbs");
  }, [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const gerarCsv = useCallback(() => {
    if (ctx.selecionados.length === 0) return;
    const header = "PDB_CODE,LIGAND,RESNUM,CHAIN,RESOLUTION";
    const linhas = ctx.selecionados.map(
      (s) =>
        `${s.pdb_id},${s.ligand},${s.resnum},${s.chain},${s.resolucao ?? ""}`,
    );
    const csv = [header, ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    if ("showSaveFilePicker" in window) {
      (window as any)
        .showSaveFilePicker({
          suggestedName: "pdb_codes.csv",
          types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
        })
        .then(async (fh: any) => {
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
        })
        .catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pdb_codes.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [ctx.selecionados]);

  return {
    fase,
    arvore,
    erroMsg,
    filtroTipo,
    setFiltroTipo,
    filtroBusca,
    setFiltroBusca,
    linhasRaw,
    tituloRaw,
    carregandoRaw,
    carregarLinhas,
    fecharRaw,
    handleVoltar,
    handleLogout,
    gerarCsv,
    selecionados: ctx.selecionados,
    isSelecionada: ctx.isSelecionada,
    toggleFolha: ctx.toggleFolha,
    adicionarFolha: ctx.adicionarFolha,
    removerFolha: ctx.removerFolha,
    limparTudo: ctx.limparTudo,
    limparPdb: ctx.limparPdb,
  };
}
