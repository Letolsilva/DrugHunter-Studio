import type { RefObject } from "react";
import { PauseIcon } from "../icons";

interface ProgressCardProps {
  pausado: boolean;
  proteinas: string[];
  labelRef: RefObject<HTMLSpanElement | null>;
  contadorRef: RefObject<HTMLSpanElement | null>;
  pctTextoRef: RefObject<HTMLSpanElement | null>;
  barraRef: RefObject<HTMLDivElement | null>;
  coletadasRef: RefObject<HTMLElement | null>;
  protAtualRef: RefObject<HTMLElement | null>;
}

export function ProgressCard({
  pausado,
  proteinas,
  labelRef,
  contadorRef,
  pctTextoRef,
  barraRef,
  coletadasRef,
  protAtualRef,
}: ProgressCardProps) {
  return (
    <div className="flex flex-col gap-3.5 rounded-xl border border-outline bg-panel px-6 py-5">
      {/* Status + label + contador */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {pausado ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-25 bg-yellow-12 px-2.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap text-yellow">
              <PauseIcon size={10} /> Pausado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-25 bg-accent-12 px-2.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap text-accent">
              <span className="inline-block h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-accent" />
              Buscando
            </span>
          )}
          <span
            ref={labelRef}
            className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px] text-foreground-muted"
          >
            Iniciando...
          </span>
        </div>
        <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-bold text-foreground-muted">
          <span ref={contadorRef}>0/0</span>
          <span className="text-accent">
            {" "}
            <span ref={pctTextoRef}>0</span>%
          </span>
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 overflow-hidden rounded border border-outline bg-surface-secondary">
        <div
          ref={barraRef}
          className={`h-full rounded transition-[width] duration-[400ms] ${
            pausado ? "shadow-yellow-glow" : "shadow-accent-glow"
          }`}
          style={{
            width: "2%",
            background: pausado
              ? "linear-gradient(90deg, #a07010, var(--color-yellow))"
              : "linear-gradient(90deg, var(--color-accent-hover), var(--color-accent))",
            minWidth: 4,
          }}
        />
      </div>

      {/* Estatísticas */}
      <div className="flex gap-5 font-mono text-[12px] text-foreground-subtle">
        <span>
          Coletadas:{" "}
          <b ref={coletadasRef} className="text-accent">
            0
          </b>
        </span>
        {proteinas.length > 1 && (
          <span>
            Proteína:{" "}
            <b ref={protAtualRef} className="text-accent">
              —
            </b>
          </span>
        )}
      </div>
    </div>
  );
}
