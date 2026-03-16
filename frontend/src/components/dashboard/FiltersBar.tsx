// components/dashboard/FiltersBar.tsx
import { type ChangeEvent, useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";

interface FiltersBarProps {
  busca: string;
  setBusca: (v: string) => void;
  filtroOrganismos: string[];
  setFiltroOrganismos: (v: string[]) => void;
  filtroProteina: string;
  setFiltroProteina: (v: string) => void;
  filtroQualidade: string;
  setFiltroQualidade: (v: string) => void;
  filtroLigante: string;
  setFiltroLigante: (v: string) => void;
  ordem: string;
  setOrdem: (v: string) => void;
  proteinas: string[];
  organismos: string[];
  onChangePage: (p: number) => void;
  onLimpar: () => void;
}

function OrganismoMultiSelect({
  organismos,
  selecionados,
  onChange,
  onChangePage,
}: {
  organismos: string[];
  selecionados: string[];
  onChange: (v: string[]) => void;
  onChangePage: (p: number) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fechar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const toggle = (org: string) => {
    const novo = selecionados.includes(org)
      ? selecionados.filter((o) => o !== org)
      : [...selecionados, org];
    onChange(novo);
    onChangePage(1);
  };

  const label =
    selecionados.length === 0
      ? "Todos os organismos"
      : selecionados.length === 1
        ? selecionados[0].length > 22
          ? selecionados[0].slice(0, 20) + "…"
          : selecionados[0]
        : `${selecionados.length} organismos`;

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 160 }}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        style={{
          width: "100%",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          padding: "0 10px",
          height: 36,
          background: "var(--bg)",
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius)",
          color: selecionados.length ? "var(--text)" : "var(--text-3)",
          fontSize: 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span style={{ opacity: 0.5, flexShrink: 0 }}>
          {aberto ? "▲" : "▼"}
        </span>
      </button>

      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 200,
            background: "var(--card)",
            border: "1px solid var(--border-2)",
            borderRadius: "var(--radius)",
            minWidth: 220,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {selecionados.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                onChangePage(1);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "7px 12px",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border)",
                color: "var(--accent)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✕ Limpar seleção
            </button>
          )}
          {organismos.map((org) => {
            const sel = selecionados.includes(org);
            return (
              <label
                key={org}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  color: sel ? "var(--text)" : "var(--text-2)",
                  background: sel ? "var(--accent-dim)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  !sel && (e.currentTarget.style.background = "var(--card-2)")
                }
                onMouseLeave={(e) =>
                  !sel && (e.currentTarget.style.background = "transparent")
                }
              >
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggle(org)}
                  style={{ accentColor: "var(--accent)", flexShrink: 0 }}
                />
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {org}
                </span>
              </label>
            );
          })}
          {organismos.length === 0 && (
            <p
              style={{
                padding: "10px 12px",
                color: "var(--text-3)",
                fontSize: 12,
              }}
            >
              Sem organismos disponíveis
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function FiltersBar({
  busca,
  setBusca,
  filtroOrganismos,
  setFiltroOrganismos,
  filtroProteina,
  setFiltroProteina,
  filtroQualidade,
  setFiltroQualidade,
  filtroLigante,
  setFiltroLigante,
  ordem,
  setOrdem,
  proteinas,
  organismos,
  onChangePage,
  onLimpar,
}: FiltersBarProps) {
  const hasFiltros =
    filtroOrganismos.length > 0 ||
    filtroProteina ||
    filtroQualidade ||
    filtroLigante ||
    busca;
  const change =
    (setter: (v: string) => void) => (e: ChangeEvent<HTMLSelectElement>) => {
      setter(e.target.value);
      onChangePage(1);
    };

  return (
    <div className="flex flex-wrap gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <input
        placeholder="🔍 Buscar por ID, título ou organismo..."
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          onChangePage(1);
        }}
        style={{ flex: 2, minWidth: 200 }}
      />

      <OrganismoMultiSelect
        organismos={organismos}
        selecionados={filtroOrganismos}
        onChange={setFiltroOrganismos}
        onChangePage={onChangePage}
      />

      {proteinas.length > 1 && (
        <select
          value={filtroProteina}
          onChange={change(setFiltroProteina)}
          style={{ flex: 1, minWidth: 140 }}
        >
          <option value="">Todas as proteínas</option>
          {proteinas.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}

      <select
        value={filtroQualidade}
        onChange={change(setFiltroQualidade)}
        style={{ minWidth: 130 }}
      >
        <option value="">Toda qualidade</option>
        {["Excelente", "Boa", "Razoável", "Verificar"].map((q) => (
          <option key={q} value={q}>
            {q}
          </option>
        ))}
      </select>

      <select
        value={filtroLigante}
        onChange={change(setFiltroLigante)}
        style={{ minWidth: 120 }}
      >
        <option value="">Ligante: todos</option>
        <option value="sim">Com ligante</option>
        <option value="nao">Sem ligante</option>
      </select>

      <select
        value={ordem}
        onChange={(e) => setOrdem(e.target.value)}
        style={{ minWidth: 130 }}
      >
        <option value="resolucao">↑ Resolução</option>
        <option value="qualidade">↑ Qualidade</option>
        <option value="data">↓ Data</option>
      </select>

      {hasFiltros && (
        <Button
          variant="ghost"
          onClick={onLimpar}
          style={{ padding: "8px 12px", fontSize: 12, whiteSpace: "nowrap" }}
        >
          ✕ Limpar
        </Button>
      )}
    </div>
  );
}
