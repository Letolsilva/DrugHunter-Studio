// components/chembl/MoleculeModal.tsx
// Modal com estrutura 2D de uma molécula via SmilesDrawer.

import { useEffect, useRef } from "react";
import SmilesDrawer from "smiles-drawer";
import type { ChemblMoleculeModel } from "../../domain/models/chembl.model";
import { CloseIcon } from "../icons";

interface Props {
  molecule: ChemblMoleculeModel;
  onClose: () => void;
}

function MoleculeCanvas({ smiles }: { smiles: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const drawer = new SmilesDrawer.Drawer({ width: 300, height: 200 });
    SmilesDrawer.parse(
      smiles,
      (tree: unknown) => {
        if (canvasRef.current) {
          drawer.draw(tree, canvasRef.current, "light");
        }
      },
      () => {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.font = "12px monospace";
          ctx.fillStyle = "#888";
          ctx.fillText("Estrutura indisponível", 10, 80);
        }
      },
    );
  }, [smiles]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={200}
      className="rounded bg-white"
    />
  );
}

export function MoleculeModal({ molecule, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-outline bg-panel p-5 flex flex-col gap-4 shadow-menu mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[13px] font-bold text-foreground">
            {molecule.molecule_chembl_id}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border-none bg-transparent p-1 text-foreground-subtle hover:text-foreground transition-colors"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Estrutura 2D */}
        {molecule.canonical_smiles ? (
          <div className="flex justify-center">
            <MoleculeCanvas smiles={molecule.canonical_smiles} />
          </div>
        ) : (
          <div className="flex justify-center items-center h-[200px] rounded bg-surface-secondary">
            <span className="font-mono text-[12px] text-foreground-subtle italic">
              SMILES indisponível
            </span>
          </div>
        )}

        {/* Metadados */}
        <div className="flex flex-col gap-1.5">
          {molecule.molecule_pref_name && (
            <MetaRow label="Nome" value={molecule.molecule_pref_name} />
          )}
          {molecule.canonical_smiles && (
            <MetaRow label="SMILES" value={molecule.canonical_smiles} mono />
          )}
          {molecule.pchembl_value != null && (
            <MetaRow label="pChEMBL" value={String(molecule.pchembl_value)} />
          )}
          {molecule.value != null && molecule.units && (
            <MetaRow
              label={molecule.type}
              value={`${molecule.value} ${molecule.units}`}
            />
          )}
          {molecule.target_pref_name && (
            <MetaRow label="Alvo" value={molecule.target_pref_name} />
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle w-[70px] shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-[12px] text-foreground break-all ${mono ? "font-mono text-[11px]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
