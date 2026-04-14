// components/visualizador/AccumulatedPanel.tsx
// Painel flutuante que mostra a seleção acumulada de todos os PDBs e gera o CSV.
import { useState } from "react";
import type { SelecionadoItem } from "../../domain/models/visualizador.model";
import { TrashIcon, ChevronDownIcon } from "../icons";
import { Spinner } from "../ui/Spinner";

interface AccumulatedPanelProps {
  selecionados: SelecionadoItem[];
  onLimparTudo: () => void;
  onLimparPdb: (pdb_id: string) => void;
  onGerarCsv: () => void;
  salvando?: boolean;
}

export function AccumulatedPanel({
  selecionados,
  onLimparTudo,
  onLimparPdb,
  onGerarCsv,
  salvando = false,
}: AccumulatedPanelProps) {
  const [minimizado, setMinimizado] = useState(false);

  if (selecionados.length === 0) return null;

  // Agrupa por pdb_id para exibição resumida
  const porPdb: Record<string, SelecionadoItem[]> = {};
  for (const item of selecionados) {
    if (!porPdb[item.pdb_id]) porPdb[item.pdb_id] = [];
    porPdb[item.pdb_id].push(item);
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex flex-col rounded-xl border border-outline bg-panel shadow-menu w-72"
      style={minimizado ? {} : { maxHeight: "60vh" }}
    >
      {/* Cabeçalho — sempre visível */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none"
        onClick={() => setMinimizado((v) => !v)}
        title={minimizado ? "Expandir" : "Minimizar"}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-foreground">
            Seleção acumulada
          </span>
          <span className="font-mono text-[11px] text-accent border border-accent-25 rounded px-1.5 py-0.5">
            {selecionados.length} {selecionados.length === 1 ? "item" : "itens"}
          </span>
        </div>
        <ChevronDownIcon
          size={14}
          className="text-foreground-subtle transition-transform duration-200"
          style={{ transform: minimizado ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
      </div>

      {/* Corpo — oculto quando minimizado */}
      {!minimizado && (
        <div
          className="flex flex-col gap-3 px-4 pb-4 overflow-y-auto"
          style={{ maxHeight: "calc(60vh - 44px)" }}
        >
          {/* Por PDB */}
          <div className="flex flex-col gap-2">
            {Object.entries(porPdb).map(([pdb_id, itens]) => (
              <div key={pdb_id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-bold text-foreground">
                    {pdb_id}
                    <span className="ml-1 text-[10px] font-normal text-foreground-subtle">
                      ({itens.length})
                    </span>
                    <span
                      className="ml-1.5 font-mono text-[9px] font-semibold px-1 py-0.5 rounded border"
                      style={itens[0].formato === "cif"
                        ? { color: "var(--color-blue)", borderColor: "color-mix(in srgb, var(--color-blue) 30%, transparent)", background: "color-mix(in srgb, var(--color-blue) 10%, transparent)" }
                        : { color: "var(--color-foreground-subtle)", borderColor: "var(--color-outline)", background: "transparent" }}
                    >
                      {itens[0].formato === "cif" ? "mmCIF" : "legacy"}
                    </span>
                  </span>
                  <button
                    type="button"
                    title={`Remover todos de ${pdb_id}`}
                    className="cursor-pointer rounded border-none bg-transparent p-0.5 text-foreground-subtle hover:text-red transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLimparPdb(pdb_id);
                    }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {itens.map((it) => (
                    <span
                      key={`${it.ligand}-${it.chain}-${it.resnum}`}
                      className="font-mono text-[10px] text-foreground-muted bg-surface-secondary border border-outline rounded px-1.5 py-0.5"
                    >
                      {it.ligand}/{it.chain}/{it.resnum}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-1 border-t border-outline">
            <button
              type="button"
              disabled={salvando}
              className="cursor-pointer w-full rounded border border-accent bg-accent-12 px-3 py-2 font-mono text-[12px] font-semibold text-accent transition-colors hover:bg-accent-15 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onGerarCsv}
            >
              {salvando ? (
                <>
                  <Spinner style={{ width: 13, height: 13, borderWidth: 2 }} />
                  Salvando...
                </>
              ) : (
                "Gerar pdb_codes.csv"
              )}
            </button>
            <button
              type="button"
              className="cursor-pointer w-full rounded border border-outline bg-transparent px-3 py-1.5 font-mono text-[11px] text-foreground-subtle transition-colors hover:text-foreground"
              onClick={onLimparTudo}
            >
              Limpar tudo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
