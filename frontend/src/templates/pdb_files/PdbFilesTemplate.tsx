// templates/pdb_files/PdbFilesTemplate.tsx
import { useNavigate } from "react-router-dom";
import { Navbar } from "../../components/layout";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { AppLogoIcon, DownloadIcon, WarningIcon } from "../../components/icons";
import { PdbFileCard } from "../../components/pdb_files/PdbFileCard";
import type { UsePdbFilesPageReturn } from "../../pages/PdbFilesPage/usePdbFilesPage";

export default function PdbFilesTemplate({
  fase,
  arquivos,
  erroMsg,
  confirmandoExclusao,
  handleExcluir,
  confirmarExclusao,
  cancelarExclusao,
  handleAbrirVisualizador,
  handleLogout,
}: UsePdbFilesPageReturn) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
          <span className="ml-1 border-l border-outline pl-3 font-mono text-[12px] text-foreground-subtle">
            Meus PDBs
          </span>
        </Navbar.Left>

        <Navbar.Right>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Busca
          </button>
          <button
            type="button"
            onClick={() => navigate("/historico")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Histórico
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

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 py-10">
        {/* Cabeçalho */}
        {fase === "ok" && (
          <div className="flex items-center gap-3 mb-8">
            <DownloadIcon size={20} className="text-accent" />
            <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
              Meus PDBs
            </h1>
            <span className="font-mono text-[12px] text-foreground-subtle border border-outline rounded px-2 py-0.5">
              {arquivos.length} {arquivos.length === 1 ? "arquivo" : "arquivos"}
            </span>
          </div>
        )}

        {/* Carregando */}
        {fase === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span className="font-mono text-[13px] text-foreground-subtle">
              Carregando arquivos...
            </span>
          </div>
        )}

        {/* Erro */}
        {fase === "erro" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <WarningIcon size={32} className="text-red" />
            <p className="text-[14px] text-red">{erroMsg}</p>
            <Button variant="ghost" onClick={() => navigate("/search")}>
              Ir para Busca
            </Button>
          </div>
        )}

        {/* Vazio */}
        {fase === "vazio" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <DownloadIcon
              size={48}
              className="text-foreground-subtle opacity-30"
            />
            <p className="font-mono text-[14px] text-foreground-subtle">
              Nenhum arquivo PDB baixado ainda.
            </p>
            <p className="max-w-xs text-center text-[12px] text-foreground-subtle">
              Realize uma busca e faça o download de estruturas para vê-las
              aqui.
            </p>
            <Button variant="ghost" onClick={() => navigate("/search")}>
              Ir para Busca
            </Button>
          </div>
        )}

        {/* Skeleton */}
        {fase === "carregando" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-52 rounded-xl border border-outline bg-panel animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Grid de cards */}
        {fase === "ok" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {arquivos.map((arquivo) => (
              <PdbFileCard
                key={arquivo.pdb_id}
                arquivo={arquivo}
                onExcluir={handleExcluir}
                onAbrir={handleAbrirVisualizador}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal de confirmação de exclusão */}
      {confirmandoExclusao !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={cancelarExclusao}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-outline bg-panel p-6 flex flex-col gap-4 shadow-menu"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[16px] font-bold text-foreground">
              Remover{" "}
              <span className="font-mono text-accent">
                {confirmandoExclusao}
              </span>
              ?
            </h2>
            <p className="text-[13px] text-foreground-muted leading-relaxed">
              Isso removerá apenas o vínculo entre você e este arquivo. O
              arquivo no servidor é preservado e compartilhado com outros
              usuários.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={cancelarExclusao}
                style={{ fontSize: 13 }}
              >
                Cancelar
              </Button>
              <button
                type="button"
                className="cursor-pointer rounded border border-red-30 bg-red-12 px-4 py-1.5 text-[13px] text-red transition-colors hover:bg-red-15"
                onClick={confirmarExclusao}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
