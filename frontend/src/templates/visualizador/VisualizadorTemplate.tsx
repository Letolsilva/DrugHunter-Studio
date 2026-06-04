// templates/visualizador/VisualizadorTemplate.tsx
import { useNavigate } from "react-router-dom";
import { Navbar } from "../../components/layout";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  CloseIcon,
  WarningIcon,
} from "../../components/icons";
import { ResidueTree } from "../../components/visualizador/ResidueTree";
import type { UseVisualizadorPageReturn } from "../../pages/VisualizadorPage/useVisualizadorPage";

type FiltroTipo = "ATOM" | "HETATM" | "AMBOS";

type Props = UseVisualizadorPageReturn & { formato: "cif" | "legacy" };

const FILTROS: { label: string; value: FiltroTipo }[] = [
  { label: "HETATM", value: "HETATM" },
  { label: "ATOM", value: "ATOM" },
  { label: "Ambos", value: "AMBOS" },
];

export default function VisualizadorTemplate({
  formato,
  fase,
  arvore,
  erroMsg,
  filtroTipo,
  setFiltroTipo,
  filtroBusca,
  setFiltroBusca,
  linhasRaw,
  tituloRaw,
  carregandoRaw,
  carregarLinhas,
  fecharRaw,
  handleVoltar,
  handleLogout,
  isSelecionada,
  toggleFolha,
  adicionarFolha,
  removerFolha,
}: Props) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-surface-primary select-none">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={handleVoltar}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Voltar a Meus PDBs"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
          {arvore && (
            <span className="ml-1 border-l border-outline pl-3 font-mono text-[12px] text-foreground-subtle">
              {arvore.pdb_id}
            </span>
          )}
        </Navbar.Left>
        <Navbar.Right>
          <button
            type="button"
            onClick={() => navigate("/redocking")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Redocking
          </button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Sair
          </Button>
        </Navbar.Right>
      </Navbar>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-8 py-10 flex flex-col gap-6">
        {/* Carregando */}
        {fase === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span className="font-mono text-[13px] text-foreground-subtle">
              {formato === "cif"
                ? "Lendo arquivo CIF..."
                : "Lendo arquivo PDB..."}
            </span>
          </div>
        )}

        {/* Erro */}
        {fase === "erro" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <WarningIcon size={32} className="text-red" />
            <p className="text-[14px] text-red">{erroMsg}</p>
            <Button variant="ghost" onClick={handleVoltar}>
              Voltar
            </Button>
          </div>
        )}

        {/* Conteúdo */}
        {fase === "ok" && arvore && (
          <>
            {/* Metadados */}
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] font-extrabold text-foreground tracking-tight inline-flex items-center gap-3">
                {arvore.pdb_id}
                {formato === "cif" && (
                  <span
                    className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: "var(--color-blue)",
                      borderColor:
                        "color-mix(in srgb, var(--color-blue) 30%, transparent)",
                      background:
                        "color-mix(in srgb, var(--color-blue) 10%, transparent)",
                    }}
                  >
                    mmCIF
                  </span>
                )}
                {arvore.resolucao !== null && (
                  <span className="font-mono text-[14px] font-normal text-foreground-subtle">
                    {arvore.resolucao} Å
                  </span>
                )}
              </h1>
              {arvore.titulo && (
                <p className="text-[13px] text-foreground-muted leading-snug max-w-2xl">
                  {arvore.titulo}
                </p>
              )}
              {arvore.organismo && (
                <p className="font-mono text-[11px] text-foreground-subtle">
                  {arvore.organismo}
                </p>
              )}
            </div>

            {/* Barra de filtros */}
            <div className="flex items-center gap-3 flex-wrap rounded-xl border border-outline bg-panel px-4 py-3">
              {/* Tipo */}
              <div className="flex items-center gap-1">
                {FILTROS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFiltroTipo(f.value)}
                    className="cursor-pointer rounded border px-3 py-1 font-mono text-[12px] transition-colors"
                    style={{
                      background:
                        filtroTipo === f.value
                          ? "var(--color-accent-12)"
                          : "transparent",
                      borderColor:
                        filtroTipo === f.value
                          ? "var(--color-accent-25)"
                          : "var(--color-outline)",
                      color:
                        filtroTipo === f.value
                          ? "var(--color-accent)"
                          : "var(--color-foreground-subtle)",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Busca por resname */}
              <input
                type="text"
                value={filtroBusca}
                onChange={(e) => setFiltroBusca(e.target.value)}
                placeholder="Buscar resíduo (ex: MN, GOL…)"
                className="rounded border border-outline bg-surface-secondary px-3 py-1 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-outline-strong flex-1 min-w-[180px]"
              />
            </div>

            {/* Árvore */}
            <div className="rounded-xl border border-outline bg-panel p-4">
              <ResidueTree
                pdb_id={arvore.pdb_id}
                resolucao={arvore.resolucao}
                formato={formato}
                arvore={arvore.arvore}
                filtroTipo={filtroTipo}
                filtroBusca={filtroBusca}
                isSelecionada={isSelecionada}
                toggleFolha={toggleFolha}
                adicionarFolha={adicionarFolha}
                removerFolha={removerFolha}
                onCarregarLinhas={carregarLinhas}
              />
            </div>
          </>
        )}
      </main>

      {/* Modal raw lines */}
      {(linhasRaw.length > 0 || carregandoRaw) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={fecharRaw}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-outline bg-panel p-5 flex flex-col gap-3 shadow-menu mx-4"
            style={{ maxHeight: "70vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] text-foreground-muted">
                {tituloRaw}
              </span>
              <button
                type="button"
                onClick={fecharRaw}
                className="cursor-pointer rounded border-none bg-transparent p-1 text-foreground-subtle hover:text-foreground"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            {carregandoRaw ? (
              <div className="flex justify-center py-8">
                <Spinner style={{ width: 24, height: 24, borderWidth: 2 }} />
              </div>
            ) : (
              <div
                className="overflow-auto rounded bg-surface-primary p-3 select-text"
                style={{ maxHeight: "calc(70vh - 80px)" }}
              >
                {linhasRaw.map((linha, i) => (
                  <p
                    key={i}
                    className="font-mono text-[11px] text-foreground-muted whitespace-pre leading-5"
                    style={{
                      color: linha.startsWith("ATOM")
                        ? "var(--color-blue)"
                        : "var(--color-accent)",
                    }}
                  >
                    {linha}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
