// contexts/VisualizadorContext.tsx
// Mantém a seleção acumulada enquanto o usuário navega entre PDBs.
import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { SelecionadoItem } from "../domain/models/visualizador.model";
import { leafKey } from "../domain/models/visualizador.model";

interface VisualizadorContextValue {
  selecionados: SelecionadoItem[];
  keysSet: Set<string>;
  adicionarFolha: (item: SelecionadoItem) => void;
  removerFolha: (
    pdb_id: string,
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
  ) => void;
  toggleFolha: (item: SelecionadoItem, tipo: string) => void;
  isSelecionada: (
    pdb_id: string,
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
  ) => boolean;
  limparTudo: () => void;
  limparPdb: (pdb_id: string) => void;
}

const VisualizadorContext = createContext<VisualizadorContextValue | null>(
  null,
);

export function useVisualizador(): VisualizadorContextValue {
  const ctx = useContext(VisualizadorContext);
  if (!ctx)
    throw new Error("useVisualizador must be used inside VisualizadorProvider");
  return ctx;
}

interface VisualizadorProviderProps {
  children: ReactNode;
}

export function VisualizadorProvider({ children }: VisualizadorProviderProps) {
  const [selecionados, setSelecionados] = useState<SelecionadoItem[]>([]);

  const keysSet = new Set(
    selecionados.map((s) => leafKey(s.pdb_id, "", s.ligand, s.chain, s.resnum)),
  );

  const isSelecionada = useCallback(
    (
      pdb_id: string,
      tipo: string,
      resname: string,
      chain: string,
      resnum: string,
    ) => {
      const k = leafKey(pdb_id, tipo, resname, chain, resnum);
      return selecionados.some(
        (s) => leafKey(s.pdb_id, tipo, s.ligand, s.chain, s.resnum) === k,
      );
    },
    [selecionados],
  );

  const adicionarFolha = useCallback((item: SelecionadoItem) => {
    setSelecionados((prev) => {
      const jaExiste = prev.some(
        (s) =>
          s.pdb_id === item.pdb_id &&
          s.ligand === item.ligand &&
          s.chain === item.chain &&
          s.resnum === item.resnum,
      );
      if (jaExiste) return prev;
      return [...prev, item];
    });
  }, []);

  const removerFolha = useCallback(
    (
      pdb_id: string,
      _tipo: string,
      resname: string,
      chain: string,
      resnum: string,
    ) => {
      setSelecionados((prev) =>
        prev.filter(
          (s) =>
            !(
              s.pdb_id === pdb_id &&
              s.ligand === resname &&
              s.chain === chain &&
              s.resnum === resnum
            ),
        ),
      );
    },
    [],
  );

  const toggleFolha = useCallback((item: SelecionadoItem, tipo: string) => {
    setSelecionados((prev) => {
      const jaExiste = prev.some(
        (s) =>
          s.pdb_id === item.pdb_id &&
          s.ligand === item.ligand &&
          s.chain === item.chain &&
          s.resnum === item.resnum,
      );
      if (jaExiste) {
        return prev.filter(
          (s) =>
            !(
              s.pdb_id === item.pdb_id &&
              s.ligand === item.ligand &&
              s.chain === item.chain &&
              s.resnum === item.resnum
            ),
        );
      }
      return [...prev, item];
    });
  }, []);

  const limparTudo = useCallback(() => setSelecionados([]), []);

  const limparPdb = useCallback((pdb_id: string) => {
    setSelecionados((prev) => prev.filter((s) => s.pdb_id !== pdb_id));
  }, []);

  return (
    <VisualizadorContext.Provider
      value={{
        selecionados,
        keysSet,
        adicionarFolha,
        removerFolha,
        toggleFolha,
        isSelecionada,
        limparTudo,
        limparPdb,
      }}
    >
      {children}
    </VisualizadorContext.Provider>
  );
}
