// components/admet/AdmetMoleculeModal.tsx
// Modal com estrutura 2D e propriedades ADMET de uma molécula.

import { useEffect, useRef } from "react";
import SmilesDrawer from "smiles-drawer";
import type { AdmetMoleculeModel } from "../../domain/models/admet.model";
import { CloseIcon } from "../icons";

function MoleculeCanvas({ smiles }: { smiles: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const drawer = new SmilesDrawer.Drawer({ width: 300, height: 200 });
    SmilesDrawer.parse(
      smiles,
      (tree: unknown) => {
        if (canvasRef.current) drawer.draw(tree, canvasRef.current, "light");
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

  return <canvas ref={canvasRef} width={300} height={200} className="rounded bg-white" />;
}

function Badge({ label, positive }: { label: string; positive: boolean }) {
  return (
    <span
      className="font-mono text-[11px] rounded px-2 py-0.5"
      style={{
        background: positive
          ? "color-mix(in srgb, var(--color-green) 15%, transparent)"
          : "color-mix(in srgb, var(--color-red) 12%, transparent)",
        color: positive ? "var(--color-green)" : "var(--color-red)",
      }}
    >
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-2">
      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle w-[60px] shrink-0 pt-0.5">
        {label}
      </span>
      <span className="font-mono text-[12px] text-foreground">{value}</span>
    </div>
  );
}

interface Props {
  molecule: AdmetMoleculeModel;
  onClose: () => void;
}

export function AdmetMoleculeModal({ molecule, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col gap-4 rounded-2xl border border-outline bg-panel p-5 shadow-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[13px] font-semibold text-foreground">
            {molecule.molecule_chembl_id}
          </span>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-surface-secondary transition-colors"
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Estrutura 2D */}
        <div className="flex justify-center">
          <MoleculeCanvas smiles={molecule.canonical_smiles} />
        </div>

        {/* Classificações */}
        <div className="flex flex-wrap gap-1.5">
          <Badge label={molecule.bbb} positive={molecule.bbb === "BBB+"} />
          <Badge label={molecule.hia} positive={molecule.hia === "HIA+"} />
          <Badge label={molecule.pgp} positive={molecule.pgp === "PGP-"} />
        </div>

        {/* Propriedades */}
        <div className="flex flex-col gap-1.5 rounded-lg border border-outline p-3">
          <Row label="TPSA" value={`${molecule.tpsa} Å²`} />
          <Row label="WLOGP" value={molecule.wlogp} />
          <Row label="MW" value={`${molecule.mw} Da`} />
          <Row label="HBD" value={molecule.hbd} />
          <Row label="HBA" value={molecule.hba} />
          <Row label="RB" value={molecule.rb} />
        </div>

        {/* SMILES */}
        <p className="font-mono text-[10px] text-foreground-subtle break-all leading-snug">
          {molecule.canonical_smiles}
        </p>
      </div>
    </div>
  );
}
