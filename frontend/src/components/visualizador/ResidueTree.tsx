// components/visualizador/ResidueTree.tsx
// Árvore 3 níveis com checkbox tri-state: tipo → resname → (chain,resnum)
import { useState, useCallback } from "react";
import type {
  ResidueLeaf,
  SelecionadoItem,
} from "../../domain/models/visualizador.model";
import { ChevronDownIcon } from "../icons";

type TriState = "all" | "none" | "partial";

interface ResidueTreeProps {
  pdb_id: string;
  resolucao: number | null;
  arvore: {
    ATOM: Record<string, ResidueLeaf[]>;
    HETATM: Record<string, ResidueLeaf[]>;
  };
  filtroTipo: "ATOM" | "HETATM" | "AMBOS";
  filtroBusca: string;
  isSelecionada: (
    pdb_id: string,
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
  ) => boolean;
  toggleFolha: (item: SelecionadoItem, tipo: string) => void;
  adicionarFolha: (item: SelecionadoItem) => void;
  removerFolha: (
    pdb_id: string,
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
  ) => void;
  onCarregarLinhas: (
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
  ) => void;
}

function triState(
  folhas: ResidueLeaf[],
  pdb_id: string,
  tipo: string,
  resname: string,
  isSel: ResidueTreeProps["isSelecionada"],
): TriState {
  const total = folhas.length;
  const sel = folhas.filter((f) =>
    isSel(pdb_id, tipo, resname, f.chain, f.resnum),
  ).length;
  if (sel === 0) return "none";
  if (sel === total) return "all";
  return "partial";
}

function TriCheckbox({
  state,
  onChange,
}: {
  state: TriState;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors"
      style={{
        background: state === "none" ? "transparent" : "var(--color-accent)",
        borderColor:
          state === "none"
            ? "var(--color-outline-strong)"
            : "var(--color-accent)",
      }}
    >
      {state === "all" && (
        <svg viewBox="0 0 10 10" width={10} height={10} fill="none">
          <polyline
            points="1.5,5 4,7.5 8.5,2.5"
            stroke="#0a0e1a"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {state === "partial" && (
        <svg viewBox="0 0 10 10" width={10} height={10}>
          <rect
            x="1.5"
            y="4.25"
            width="7"
            height="1.5"
            rx="0.75"
            fill="#0a0e1a"
          />
        </svg>
      )}
    </button>
  );
}

interface TipoNodeProps {
  tipo: "ATOM" | "HETATM";
  grupos: Record<string, ResidueLeaf[]>;
  pdb_id: string;
  resolucao: number | null;
  filtroBusca: string;
  isSelecionada: ResidueTreeProps["isSelecionada"];
  toggleFolha: ResidueTreeProps["toggleFolha"];
  adicionarFolha: ResidueTreeProps["adicionarFolha"];
  removerFolha: ResidueTreeProps["removerFolha"];
  onCarregarLinhas: ResidueTreeProps["onCarregarLinhas"];
}

function TipoNode({
  tipo,
  grupos,
  pdb_id,
  resolucao,
  filtroBusca,
  isSelecionada,
  toggleFolha,
  adicionarFolha,
  removerFolha,
  onCarregarLinhas,
}: TipoNodeProps) {
  const [aberto, setAberto] = useState(true);

  const gruposFiltrados = Object.entries(grupos).filter(([rn]) => {
    if (filtroBusca && !rn.toLowerCase().includes(filtroBusca.toLowerCase()))
      return false;
    return true;
  });

  const todasFolhas = gruposFiltrados.flatMap(([rn, folhas]) =>
    folhas.map((f) => ({ rn, f })),
  );
  const totalFolhas = todasFolhas.length;
  const selFolhas = todasFolhas.filter(({ rn, f }) =>
    isSelecionada(pdb_id, tipo, rn, f.chain, f.resnum),
  ).length;

  const estadoTipo: TriState =
    totalFolhas === 0
      ? "none"
      : selFolhas === 0
        ? "none"
        : selFolhas === totalFolhas
          ? "all"
          : "partial";

  const toggleTipo = () => {
    if (estadoTipo === "all") {
      todasFolhas.forEach(({ rn, f }) =>
        removerFolha(pdb_id, tipo, rn, f.chain, f.resnum),
      );
    } else {
      todasFolhas.forEach(({ rn, f }) =>
        adicionarFolha({
          pdb_id,
          ligand: rn,
          resnum: f.resnum,
          chain: f.chain,
          resolucao,
        }),
      );
    }
  };

  if (gruposFiltrados.length === 0) return null;

  return (
    <div className="flex flex-col">
      {/* Nó tipo */}
      <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-panel-hover select-none">
        <TriCheckbox state={estadoTipo} onChange={toggleTipo} />
        <button
          type="button"
          className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none text-left flex-1"
          onClick={() => setAberto((v) => !v)}
        >
          <ChevronDownIcon
            size={14}
            className="text-foreground-subtle transition-transform"
            style={{ transform: aberto ? "rotate(0deg)" : "rotate(-90deg)" }}
          />
          <span className="font-mono text-[13px] font-semibold text-foreground">
            {tipo}
          </span>
          <span className="text-[11px] text-foreground-subtle ml-1">
            {gruposFiltrados.length} grupos · {totalFolhas} resíduos
          </span>
        </button>
      </div>

      {/* Filhos (resnames) */}
      {aberto && (
        <div className="ml-6 flex flex-col">
          {gruposFiltrados.map(([resname, folhas]) => (
            <ResnameNode
              key={resname}
              tipo={tipo}
              resname={resname}
              folhas={folhas}
              pdb_id={pdb_id}
              resolucao={resolucao}
              isSelecionada={isSelecionada}
              toggleFolha={toggleFolha}
              adicionarFolha={adicionarFolha}
              removerFolha={removerFolha}
              onCarregarLinhas={onCarregarLinhas}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ResnameNodeProps {
  tipo: string;
  resname: string;
  folhas: ResidueLeaf[];
  pdb_id: string;
  resolucao: number | null;
  isSelecionada: ResidueTreeProps["isSelecionada"];
  toggleFolha: ResidueTreeProps["toggleFolha"];
  adicionarFolha: ResidueTreeProps["adicionarFolha"];
  removerFolha: ResidueTreeProps["removerFolha"];
  onCarregarLinhas: ResidueTreeProps["onCarregarLinhas"];
}

function ResnameNode({
  tipo,
  resname,
  folhas,
  pdb_id,
  resolucao,
  isSelecionada,
  toggleFolha,
  adicionarFolha,
  removerFolha,
  onCarregarLinhas,
}: ResnameNodeProps) {
  const [aberto, setAberto] = useState(false);

  const estado = triState(folhas, pdb_id, tipo, resname, isSelecionada);

  const toggleResname = () => {
    if (estado === "all") {
      folhas.forEach((f) =>
        removerFolha(pdb_id, tipo, resname, f.chain, f.resnum),
      );
    } else {
      folhas.forEach((f) =>
        adicionarFolha({
          pdb_id,
          ligand: resname,
          resnum: f.resnum,
          chain: f.chain,
          resolucao,
        }),
      );
    }
  };

  return (
    <div className="flex flex-col">
      {/* Nó resname */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-panel-hover select-none">
        <TriCheckbox state={estado} onChange={toggleResname} />
        <button
          type="button"
          className="flex items-center gap-1.5 cursor-pointer bg-transparent border-none text-left flex-1"
          onClick={() => setAberto((v) => !v)}
        >
          <ChevronDownIcon
            size={12}
            className="text-foreground-subtle transition-transform"
            style={{ transform: aberto ? "rotate(0deg)" : "rotate(-90deg)" }}
          />
          <span className="font-mono text-[12px] font-medium text-accent">
            {resname}
          </span>
          <span className="text-[11px] text-foreground-subtle ml-1">
            {folhas.length} {folhas.length === 1 ? "ocorrência" : "ocorrências"}
          </span>
        </button>
      </div>

      {/* Folhas (chain/resnum) */}
      {aberto && (
        <div className="ml-6 flex flex-col">
          {folhas.map((f) => {
            const sel = isSelecionada(pdb_id, tipo, resname, f.chain, f.resnum);
            return (
              <div
                key={`${f.chain}-${f.resnum}`}
                className="flex items-center gap-2 px-3 py-1 rounded hover:bg-panel-hover select-none"
              >
                <TriCheckbox
                  state={sel ? "all" : "none"}
                  onChange={() =>
                    toggleFolha(
                      {
                        pdb_id,
                        ligand: resname,
                        resnum: f.resnum,
                        chain: f.chain,
                        resolucao,
                      },
                      tipo,
                    )
                  }
                />
                <span className="font-mono text-[11px] text-foreground-muted flex-1">
                  Cadeia <b className="text-foreground">{f.chain}</b>
                  {" · "}Res <b className="text-foreground">{f.resnum}</b>
                  {" · "}
                  <span className="text-foreground-subtle">
                    {f.n_atomos} átomo{f.n_atomos !== 1 ? "s" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  title="Ver linhas raw"
                  className="cursor-pointer rounded border-none bg-transparent px-1.5 py-0.5 font-mono text-[10px] text-foreground-subtle border border-outline hover:border-outline-strong hover:text-foreground transition-colors"
                  onClick={() =>
                    onCarregarLinhas(tipo, resname, f.chain, f.resnum)
                  }
                >
                  raw
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ResidueTree({
  pdb_id,
  resolucao,
  arvore,
  filtroTipo,
  filtroBusca,
  isSelecionada,
  toggleFolha,
  adicionarFolha,
  removerFolha,
  onCarregarLinhas,
}: ResidueTreeProps) {
  const tipos: Array<"ATOM" | "HETATM"> =
    filtroTipo === "AMBOS"
      ? ["HETATM", "ATOM"]
      : filtroTipo === "HETATM"
        ? ["HETATM"]
        : ["ATOM"];

  return (
    <div className="flex flex-col gap-1">
      {tipos.map((tipo) => (
        <TipoNode
          key={tipo}
          tipo={tipo}
          grupos={arvore[tipo]}
          pdb_id={pdb_id}
          resolucao={resolucao}
          filtroBusca={filtroBusca}
          isSelecionada={isSelecionada}
          toggleFolha={toggleFolha}
          adicionarFolha={adicionarFolha}
          removerFolha={removerFolha}
          onCarregarLinhas={onCarregarLinhas}
        />
      ))}
    </div>
  );
}
