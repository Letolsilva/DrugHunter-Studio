// components/dashboard/FiltersBar.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/Button";
import { ChevronDownIcon, CloseIcon, SearchIcon } from "../icons";

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

// â”€â”€ Dropdown genÃ©rico (valor Ãºnico) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CustomSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  const selected = options.find((o) => o.value === value) ?? options[0];
  const isDefault = value === options[0].value;

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-outline bg-surface-primary px-2.5 text-[13px] text-left transition-colors hover:border-outline-strong ${
          isDefault ? "text-foreground-subtle" : "text-foreground"
        }`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {selected.label}
        </span>
        <span
          className={`inline-flex shrink-0 opacity-50 transition-transform duration-150 ${
            aberto ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>

      {aberto && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-200 w-full overflow-hidden rounded-lg border border-outline bg-surface-secondary shadow-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setAberto(false);
              }}
              className={`block w-full px-3 py-2 text-left text-[12px] transition-colors hover:bg-panel-hover ${
                value === opt.value ? "text-accent" : "text-foreground-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Multi-select de organismos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (!aberto) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

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
          ? selecionados[0].slice(0, 20) + "â€¦"
          : selecionados[0]
        : `${selecionados.length} organismos`;

  return (
    <div ref={ref} className="relative min-w-40 flex-1">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className={`flex h-9 w-full cursor-pointer items-center justify-between gap-1.5 overflow-hidden rounded-lg border border-outline bg-surface-primary px-2.5 text-[13px] text-left transition-colors hover:border-outline-strong ${
          selecionados.length > 0 ? "text-foreground" : "text-foreground-subtle"
        }`}
      >
        <span className="overflow-hidden text-ellipsis whitespace-nowrap">
          {label}
        </span>
        <span
          className={`inline-flex shrink-0 opacity-50 transition-transform duration-150 ${
            aberto ? "rotate-180" : ""
          }`}
        >
          <ChevronDownIcon size={12} />
        </span>
      </button>

      {aberto && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-200 w-full max-h-64 overflow-x-auto overflow-y-auto rounded-lg border border-outline bg-surface-secondary shadow-menu">
          {selecionados.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                onChangePage(1);
              }}
              className="block w-full border-b border-outline px-3 py-1.75 text-left text-[12px] text-accent transition-colors hover:bg-panel-hover"
            >
              <span className="inline-flex items-center gap-1.5">
                <CloseIcon size={11} /> Limpar seleção
              </span>
            </button>
          )}
          {organismos.map((org) => {
            const sel = selecionados.includes(org);
            return (
              <label
                key={org}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.75 text-[12px] transition-colors ${
                  sel
                    ? "bg-accent-12 text-foreground"
                    : "text-foreground-muted hover:bg-panel-hover"
                }`}
              >
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => toggle(org)}
                  className="shrink-0 accent-accent"
                />
                <span className="whitespace-nowrap">{org}</span>
              </label>
            );
          })}
          {organismos.length === 0 && (
            <p className="px-3 py-2.5 text-[12px] text-foreground-subtle">
              Sem organismos disponÃ­veis
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// â”€â”€ FiltersBar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-outline bg-panel p-4">
      {/* Busca */}
      <div className="relative min-w-50 flex-2 ">
        <input
          placeholder="Buscar por ID, tÃ­tulo ou organismo..."
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            onChangePage(1);
          }}
          className="h-9 w-full rounded-lg border border-outline bg-surface-primary pl-9 pr-2.5 text-[13px] text-foreground placeholder:text-foreground-subtle focus:border-outline-strong focus:outline-none"
        />
      </div>

      {/* Organismos */}
      <OrganismoMultiSelect
        organismos={organismos}
        selecionados={filtroOrganismos}
        onChange={setFiltroOrganismos}
        onChangePage={onChangePage}
      />

      {/* ProteÃ­nas */}
      {proteinas.length > 1 && (
        <div className="min-w-35 flex-1">
          <CustomSelect
            value={filtroProteina}
            onChange={(v) => {
              setFiltroProteina(v);
              onChangePage(1);
            }}
            options={[
              { value: "", label: "Todas as proteí­nas" },
              ...proteinas.map((p) => ({ value: p, label: p })),
            ]}
          />
        </div>
      )}

      {/* Qualidade */}
      <div className="min-w-32.5">
        <CustomSelect
          value={filtroQualidade}
          onChange={(v) => {
            setFiltroQualidade(v);
            onChangePage(1);
          }}
          options={[
            { value: "", label: "Toda qualidade" },
            ...["Excelente", "Boa", "RazoÃ¡vel", "Verificar"].map((q) => ({
              value: q,
              label: q,
            })),
          ]}
        />
      </div>

      {/* Ligante */}
      <div className="min-w-30">
        <CustomSelect
          value={filtroLigante}
          onChange={(v) => {
            setFiltroLigante(v);
            onChangePage(1);
          }}
          options={[
            { value: "", label: "Ligante: todos" },
            { value: "sim", label: "Com ligante" },
            { value: "nao", label: "Sem ligante" },
          ]}
        />
      </div>

      {/* Ordem */}
      <div className="min-w-45">
        <CustomSelect
          value={ordem}
          onChange={setOrdem}
          options={[
            { value: "resolucao", label: "Resolução (crescente)" },
            { value: "qualidade", label: "Qualidade (melhor primeiro)" },
            { value: "data", label: "Data (mais recente)" },
          ]}
        />
      </div>

      {/* Limpar */}
      {hasFiltros && (
        <Button
          variant="ghost"
          onClick={onLimpar}
          style={{ padding: "8px 12px", fontSize: 12, whiteSpace: "nowrap" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CloseIcon size={11} /> Limpar
          </span>
        </Button>
      )}
    </div>
  );
}
