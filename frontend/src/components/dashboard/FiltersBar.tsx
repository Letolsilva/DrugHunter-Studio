// components/dashboard/FiltersBar.tsx
import type { ChangeEvent } from "react";
import { Button } from "../ui/Button";

interface FiltersBarProps {
  busca: string;
  setBusca: (v: string) => void;
  filtroOrganismo: string;
  setFiltroOrganismo: (v: string) => void;
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

export function FiltersBar({
  busca,
  setBusca,
  filtroOrganismo,
  setFiltroOrganismo,
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
    filtroOrganismo ||
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

      <select
        value={filtroOrganismo}
        onChange={change(setFiltroOrganismo)}
        style={{ flex: 1, minWidth: 140 }}
      >
        <option value="">Todos os organismos</option>
        {organismos.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

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
