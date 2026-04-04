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
  if (filtros.filtroResolucaoMax) {
    const max = parseFloat(filtros.filtroResolucaoMax);
    if (!isNaN(max)) r = r.filter((d) => d.resolucao != null && d.resolucao <= max);
  }
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

const RESOLUCAO_FAIXAS = [
  { name: "< 1.5 Ã…",   min: 0,    max: 1.5  },
  { name: "1.5â€“2.0 Ã…", min: 1.5,  max: 2.0  },
  { name: "2.0â€“2.5 Ã…", min: 2.0,  max: 2.5  },
  { name: "2.5â€“3.0 Ã…", min: 2.5,  max: 3.0  },
  { name: "> 3.0 Ã…",   min: 3.0,  max: 9999 },
  { name: "N/D",       min: -1,   max: -1   },
];

export function getChartData(filtrados: PdbResultModel[]): DashboardChartData {
  const metodoMap: Record<string, number> = {};
  const proteinaMap: Record<string, number> = {};
  const resolucaoMap: Record<string, number> = Object.fromEntries(
    RESOLUCAO_FAIXAS.map((f) => [f.name, 0]),
  );

  filtrados.forEach((d) => {
    if (d.metodo) metodoMap[d.metodo] = (metodoMap[d.metodo] ?? 0) + 1;
    if (d.proteina_buscada)
      proteinaMap[d.proteina_buscada] =
        (proteinaMap[d.proteina_buscada] ?? 0) + 1;

    if (d.resolucao == null) {
      resolucaoMap["N/D"]++;
    } else {
      const faixa = RESOLUCAO_FAIXAS.find(
        (f) => f.min >= 0 && d.resolucao! > f.min && d.resolucao! <= f.max,
      );
      if (faixa) resolucaoMap[faixa.name]++;
      else resolucaoMap["N/D"]++;
    }
  });

  return {
    resolucao: RESOLUCAO_FAIXAS.map((f) => ({
      name: f.name,
      value: resolucaoMap[f.name],
    })).filter((f) => f.value > 0),
    metodo: Object.entries(metodoMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({
        name: name.length > 18 ? name.slice(0, 16) + "â€¦" : name,
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
  "depositado_em",
  "link_pdb",
];

export function gerarCSVString(filtrados: PdbResultModel[]): string {
  const rows = [CSV_COLS.join(",")];
  filtrados.forEach((d) => {
    rows.push(
      CSV_COLS.map((col) => {
        const v =
          col === "tem_ligante" ? (d[col] ? "Sim" : "NÃ£o") : (d[col] ?? "");
        return `"${String(v).replace(/"/g, '\"\"')}"`;
      }).join(","),
    );
  });
  return rows.join("\n");
}
