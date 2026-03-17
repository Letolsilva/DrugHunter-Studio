// data/adapters/dashboard.adapter.ts
import type { PdbResultModel } from "../../domain/models/search.model";
import type {
  DashboardChartData,
  DashboardFilters,
} from "../../domain/models/dashboard.model";

export function getOrganismos(dados: PdbResultModel[]): string[] {
  const set = new Set<string>();
  dados.forEach((d) => {
    if (d.organismo)
      d.organismo.split("|").forEach((o) => {
        const t = o.trim();
        if (t && t !== "N/A") set.add(t);
      });
  });
  return [...set].sort();
}

export function aplicarFiltros(
  dados: PdbResultModel[],
  filtros: DashboardFilters,
): PdbResultModel[] {
  let r = dados;

  if (filtros.filtroOrganismo)
    r = r.filter((d) => d.organismo?.includes(filtros.filtroOrganismo));
  if (filtros.filtroProteina)
    r = r.filter((d) => d.proteina_buscada === filtros.filtroProteina);
  if (filtros.filtroQualidade)
    r = r.filter((d) => d.qualidade === filtros.filtroQualidade);
  if (filtros.filtroLigante === "sim") r = r.filter((d) => d.tem_ligante);
  if (filtros.filtroLigante === "nao") r = r.filter((d) => !d.tem_ligante);

  if (filtros.busca) {
    const q = filtros.busca.toLowerCase();
    r = r.filter(
      (d) =>
        d.pdb_id?.toLowerCase().includes(q) ||
        d.titulo?.toLowerCase().includes(q) ||
        d.organismo?.toLowerCase().includes(q),
    );
  }

  return [...r].sort((a, b) => {
    if (filtros.ordem === "resolucao")
      return (a.resolucao ?? 99) - (b.resolucao ?? 99);
    if (filtros.ordem === "qualidade") {
      const ord = ["Excelente", "Boa", "Razoável", "Verificar"];
      return ord.indexOf(a.qualidade) - ord.indexOf(b.qualidade);
    }
    if (filtros.ordem === "data")
      return (b.depositado_em ?? "").localeCompare(a.depositado_em ?? "");
    return 0;
  });
}

export function paginar(
  filtrados: PdbResultModel[],
  pagina: number,
  porPagina: number,
): { paginaAtual: PdbResultModel[]; paginas: number } {
  const paginas = Math.ceil(filtrados.length / porPagina);
  const paginaAtual = filtrados.slice(
    (pagina - 1) * porPagina,
    pagina * porPagina,
  );
  return { paginaAtual, paginas };
}

export function getChartData(filtrados: PdbResultModel[]): DashboardChartData {
  const qualidadeMap: Record<string, number> = {};
  const metodoMap: Record<string, number> = {};
  const proteinaMap: Record<string, number> = {};

  filtrados.forEach((d) => {
    qualidadeMap[d.qualidade] = (qualidadeMap[d.qualidade] ?? 0) + 1;
    if (d.metodo) metodoMap[d.metodo] = (metodoMap[d.metodo] ?? 0) + 1;
    if (d.proteina_buscada)
      proteinaMap[d.proteina_buscada] =
        (proteinaMap[d.proteina_buscada] ?? 0) + 1;
  });

  return {
    qualidade: Object.entries(qualidadeMap).map(([name, value]) => ({
      name,
      value,
    })),
    metodo: Object.entries(metodoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({
        name: name.length > 18 ? name.slice(0, 16) + "…" : name,
        value,
      })),
    proteina: Object.entries(proteinaMap).map(([name, value]) => ({
      name,
      value,
    })),
  };
}

const CSV_COLS: (keyof PdbResultModel)[] = [
  "pdb_id",
  "proteina_buscada",
  "titulo",
  "organismo",
  "classificacao",
  "resolucao",
  "metodo",
  "tem_ligante",
  "num_cadeias",
  "ramachandran",
  "depositado_em",
  "qualidade",
  "link_pdb",
];

export function gerarCSVString(filtrados: PdbResultModel[]): string {
  const rows = [CSV_COLS.join(",")];
  filtrados.forEach((d) => {
    rows.push(
      CSV_COLS.map((col) => {
        const v =
          col === "tem_ligante" ? (d[col] ? "Sim" : "Não") : (d[col] ?? "");
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(","),
    );
  });
  return rows.join("\n");
}
