// components/dashboard/FiltersBar.tsx
import { Button } from "../ui/Button";
import { SearchInput } from "../ui/SearchInput";
import { DropdownSelect } from "../ui/DropdownSelect";
import { CloseIcon } from "../icons";

interface FiltersBarProps {
  busca: string;
  setBusca: (v: string) => void;
  filtroOrganismo: string;
  setFiltroOrganismo: (v: string) => void;
  filtroProteina: string;
  setFiltroProteina: (v: string) => void;
  filtroResolucaoMax: string;
  setFiltroResolucaoMax: (v: string) => void;
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
  filtroResolucaoMax,
  setFiltroResolucaoMax,
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
    filtroResolucaoMax ||
    filtroLigante ||
    busca;

  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-outline bg-panel p-4">
      {/* Busca por texto */}
      <div className="min-w-50 flex-2">
        <SearchInput
          value={busca}
          onChange={(v) => {
            setBusca(v);
            onChangePage(1);
          }}
          placeholder="Buscar por ID, titulo ou organismo..."
        />
      </div>

      {/* Dropdown de organismos */}
      <div className="min-w-40 flex-1">
        <DropdownSelect
          value={filtroOrganismo}
          onChange={(v) => {
            setFiltroOrganismo(v);
            onChangePage(1);
          }}
          options={[
            { value: "", label: "Todos os organismos" },
            ...organismos.map((o) => ({ value: o, label: o })),
          ]}
        />
      </div>

      {/* Dropdown de proteinas (so aparece quando ha mais de uma) */}
      {proteinas.length > 1 && (
        <div className="min-w-35 flex-1">
          <DropdownSelect
            value={filtroProteina}
            onChange={(v) => {
              setFiltroProteina(v);
              onChangePage(1);
            }}
            options={[
              { value: "", label: "Todas as proteinas" },
              ...proteinas.map((p) => ({ value: p, label: p })),
            ]}
          />
        </div>
      )}

      {/* Input de resolução máxima */}
      <div className="min-w-36 flex-none">
        <div className="relative flex items-center">
          <input
            type="number"
            min="0"
            step="0.1"
            value={filtroResolucaoMax}
            onChange={(e) => {
              setFiltroResolucaoMax(e.target.value);
              onChangePage(1);
            }}
            placeholder="Res. máx. (Å)"
            className="w-full rounded-lg border border-outline bg-surface px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Dropdown de ligante */}
      <div className="min-w-30">
        <DropdownSelect
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

      {/* Dropdown de ordenacao */}
      <div className="min-w-45">
        <DropdownSelect
          value={ordem}
          onChange={setOrdem}
          options={[
            { value: "resolucao", label: "Resolucao (crescente)" },
            { value: "data", label: "Data (mais recente)" },
          ]}
        />
      </div>
    </div>
  );
}
