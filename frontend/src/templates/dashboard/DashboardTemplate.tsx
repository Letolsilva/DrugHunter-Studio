// templates/dashboard/DashboardTemplate.tsx
import { useState, useMemo } from "react";
import { QualityPieChart } from "../../components/charts/QualityPieChart";
import { MethodBarChart } from "../../components/charts/MethodBarChart";
import { ProteinBarChart } from "../../components/charts/ProteinBarChart";
import { StatsRow } from "../../components/dashboard/StatsRow";
import { FiltersBar } from "../../components/dashboard/FiltersBar";
import { ResultsTable } from "../../components/dashboard/ResultsTable";
import { Pagination } from "../../components/dashboard/Pagination";
import { Button } from "../../components/ui/Button";
import { DownloadIcon } from "../../components/icons";
import type { PdbResultModel } from "../../domain/models/search.model";

interface DashboardTemplateProps {
  dados: PdbResultModel[];
  proteinas: string[];
  onNovaBusca: () => void;
  inputOriginal: string;
}

export default function DashboardTemplate({
  dados,
  proteinas,
  onNovaBusca,
  inputOriginal: _inputOriginal,
}: DashboardTemplateProps) {
  const [filtroOrganismos, setFiltroOrganismos] = useState<string[]>([]);
  const [filtroProteina, setFiltroProteina] = useState("");
  const [filtroQualidade, setFiltroQualidade] = useState("");
  const [filtroLigante, setFiltroLigante] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("resolucao");
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 20;

  const organismos = useMemo(() => {
    const set = new Set<string>();
    dados.forEach((d) => {
      if (d.organismo)
        d.organismo.split("|").forEach((o) => {
          const t = o.trim();
          if (t && t !== "N/A") set.add(t);
        });
    });
    return [...set].sort();
  }, [dados]);

  const filtrados = useMemo(() => {
    let r = dados;
    if (filtroOrganismos.length > 0)
      r = r.filter((d) =>
        filtroOrganismos.some((o) => d.organismo?.includes(o)),
      );
    if (filtroProteina)
      r = r.filter((d) => d.proteina_buscada === filtroProteina);
    if (filtroQualidade) r = r.filter((d) => d.qualidade === filtroQualidade);
    if (filtroLigante === "sim") r = r.filter((d) => d.tem_ligante);
    if (filtroLigante === "nao") r = r.filter((d) => !d.tem_ligante);
    if (busca) {
      const q = busca.toLowerCase();
      r = r.filter(
        (d) =>
          d.pdb_id?.toLowerCase().includes(q) ||
          d.titulo?.toLowerCase().includes(q) ||
          d.organismo?.toLowerCase().includes(q),
      );
    }
    return [...r].sort((a, b) => {
      if (ordem === "resolucao")
        return (a.resolucao ?? 99) - (b.resolucao ?? 99);
      if (ordem === "qualidade") {
        const ord = ["Excelente", "Boa", "Razoável", "Verificar"];
        return ord.indexOf(a.qualidade) - ord.indexOf(b.qualidade);
      }
      if (ordem === "data")
        return (b.depositado_em ?? "").localeCompare(a.depositado_em ?? "");
      return 0;
    });
  }, [
    dados,
    filtroOrganismos,
    filtroProteina,
    filtroQualidade,
    filtroLigante,
    busca,
    ordem,
  ]);

  const paginas = Math.ceil(filtrados.length / POR_PAGINA);
  const paginaAtual = filtrados.slice(
    (pagina - 1) * POR_PAGINA,
    pagina * POR_PAGINA,
  );

  const dadosQualidade = useMemo(() => {
    const c: Record<string, number> = {};
    filtrados.forEach((d) => {
      c[d.qualidade] = (c[d.qualidade] ?? 0) + 1;
    });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [filtrados]);

  const dadosMetodo = useMemo(() => {
    const c: Record<string, number> = {};
    filtrados.forEach((d) => {
      if (d.metodo) c[d.metodo] = (c[d.metodo] ?? 0) + 1;
    });
    return Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({
        name: name.length > 18 ? name.slice(0, 16) + "…" : name,
        value,
      }));
  }, [filtrados]);

  const dadosProteina = useMemo(() => {
    const c: Record<string, number> = {};
    filtrados.forEach((d) => {
      if (d.proteina_buscada)
        c[d.proteina_buscada] = (c[d.proteina_buscada] ?? 0) + 1;
    });
    return Object.entries(c).map(([name, value]) => ({ name, value }));
  }, [filtrados]);

  const downloadCSV = () => {
    const cols: (keyof PdbResultModel)[] = [
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
    const rows = [cols.join(",")];
    filtrados.forEach((d) => {
      rows.push(
        cols
          .map((c) => {
            const v =
              c === "tem_ligante" ? (d[c] ? "Sim" : "Não") : (d[c] ?? "");
            return `"${String(v).replace(/"/g, '""')}"`;
          })
          .join(","),
      );
    });
    const blob = new Blob([rows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "pdb_resultados.csv",
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const limparFiltros = () => {
    setFiltroOrganismos([]);
    setFiltroProteina("");
    setFiltroQualidade("");
    setFiltroLigante("");
    setBusca("");
    setPagina(1);
  };

  return (
    <div className="flex flex-col gap-5 w-full fade-in">
      {/* Header de resultado */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[22px] font-extrabold text-foreground tracking-tight">
            {dados.length} estruturas coletadas
          </h2>
          <p className="text-[12px] text-foreground-subtle font-mono mt-1">
            {proteinas.join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={downloadCSV}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <DownloadIcon size={13} /> CSV
            </span>
          </Button>
          <Button
            variant="primary"
            onClick={onNovaBusca}
            style={{ fontSize: 13, padding: "8px 16px" }}
          >
            + Nova busca
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsRow dados={dados} organismos={organismos} />

      {/* Gráficos */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="bg-panel border border-outline rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
            Distribuição de Qualidade
          </h3>
          <QualityPieChart data={dadosQualidade} />
        </div>
        <div className="bg-panel border border-outline rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
            Método Experimental
          </h3>
          <MethodBarChart data={dadosMetodo} />
        </div>
        {proteinas.length > 1 && (
          <div className="bg-panel border border-outline rounded-xl p-5">
            <h3 className="text-[13px] font-bold text-foreground-muted uppercase tracking-[0.5px] mb-3">
              Estruturas por Proteína
            </h3>
            <ProteinBarChart data={dadosProteina} />
          </div>
        )}
      </div>

      {/* Filtros */}
      <FiltersBar
        busca={busca}
        setBusca={setBusca}
        filtroOrganismos={filtroOrganismos}
        setFiltroOrganismos={setFiltroOrganismos}
        filtroProteina={filtroProteina}
        setFiltroProteina={setFiltroProteina}
        filtroQualidade={filtroQualidade}
        setFiltroQualidade={setFiltroQualidade}
        filtroLigante={filtroLigante}
        setFiltroLigante={setFiltroLigante}
        ordem={ordem}
        setOrdem={setOrdem}
        proteinas={proteinas}
        organismos={organismos}
        onChangePage={setPagina}
        onLimpar={limparFiltros}
      />

      <p className="text-[12px] text-foreground-subtle font-mono">
        Exibindo <b className="text-foreground-muted">{filtrados.length}</b> de{" "}
        <b className="text-foreground-muted">{dados.length}</b> estruturas
      </p>

      <ResultsTable rows={paginaAtual} />

      <Pagination
        pagina={pagina}
        paginas={paginas}
        onPrev={() => setPagina((p) => Math.max(1, p - 1))}
        onNext={() => setPagina((p) => Math.min(paginas, p + 1))}
      />
    </div>
  );
}
