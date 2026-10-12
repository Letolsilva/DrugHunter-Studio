// templates/pdb_files/PdbFilesTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ClockIcon,
  DownloadIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  RefreshIcon,
  SettingsIcon,
  WarningIcon,
} from "../../components/icons";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { PdbFileCard } from "../../components/pdb_files/PdbFileCard";
import type {
  UsePdbFilesPageReturn,
  FiltroFormato,
} from "../../pages/PdbFilesPage/usePdbFilesPage";

const OPCOES_FORMATO: { value: FiltroFormato; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "legacy", label: "Legacy PDB (.pdb)" },
  { value: "cif", label: "PDBx/mmCIF (.cif)" },
];

export default function PdbFilesTemplate({
  fase,
  arquivos,
  arquivosFiltrados,
  erroMsg,
  confirmandoExclusao,
  filtroFormato,
  setFiltroFormato,
  handleExcluir,
  confirmarExclusao,
  cancelarExclusao,
  handleAbrirVisualizador,
  handleLogout,
}: UsePdbFilesPageReturn) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="cursor-pointer rounded border-none bg-transparent text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            title="Início"
          >
            <AppLogoIcon size={17} className="text-foreground-muted" />
            DrugHunter<b className="text-foreground font-extrabold">Studio</b>
          </button>
          <span className="ml-1 border-l border-outline pl-3 font-mono text-[12px] text-foreground-subtle">
            Meus PDBs
          </span>
        </Navbar.Left>

        <Navbar.Middle>
          <MiddleBar activeModule={null} />
        </Navbar.Middle>

        <Navbar.Right>
          <button
            type="button"
            onClick={() => navigate("/redocking")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Redocking
          </button>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => { setMenuAberto(false); navigate("/configuracoes"); }}
              divider
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={() => { setMenuAberto(false); navigate("/ajuda"); }}
              divider
            />
            <DropdownMenu.Item
              icon={<LogoutIcon size={14} />}
              label="Sair"
              onClick={handleLogout}
            />
          </DropdownMenu>
        </Navbar.Right>
      </Navbar>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 py-10">
        {/* Cabeçalho + filtro de formato */}
        {fase === "ok" && (
          <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
            <div className="flex items-center gap-3">
              <DownloadIcon size={20} className="text-accent" />
              <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
                Meus PDBs
              </h1>
              <span className="font-mono text-[12px] text-foreground-subtle border border-outline rounded px-2 py-0.5">
                {arquivosFiltrados.length}{" "}
                {arquivosFiltrados.length === 1 ? "arquivo" : "arquivos"}
                {filtroFormato !== "todos" && (
                  <span className="ml-1 text-accent">
                    · {arquivos.length} total
                  </span>
                )}
              </span>
            </div>

            {/* Filtro por formato */}
            <div className="flex gap-1">
              {OPCOES_FORMATO.map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setFiltroFormato(op.value)}
                  className={[
                    "cursor-pointer rounded border px-3 py-1.5 font-mono text-[11px] transition-colors",
                    filtroFormato === op.value
                      ? "border-accent bg-accent-12 text-accent"
                      : "border-outline bg-transparent text-foreground-subtle hover:border-outline-strong hover:text-foreground",
                  ].join(" ")}
                >
                  {op.label}
                </button>
              ))}
            </div>
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
            <Button variant="ghost" onClick={() => navigate("/busca-pdb")}>
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
            <Button variant="ghost" onClick={() => navigate("/busca-pdb")}>
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
          <>
            {arquivosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <p className="font-mono text-[13px] text-foreground-subtle">
                  Nenhum arquivo no formato selecionado.
                </p>
                <button
                  type="button"
                  onClick={() => setFiltroFormato("todos")}
                  className="cursor-pointer font-mono text-[12px] text-accent hover:underline"
                >
                  Ver todos
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {arquivosFiltrados.map((arquivo) => (
                  <PdbFileCard
                    key={`${arquivo.pdb_id}-${arquivo.formato}`}
                    arquivo={arquivo}
                    onExcluir={handleExcluir}
                    onAbrir={handleAbrirVisualizador}
                  />
                ))}
              </div>
            )}
          </>
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
                {confirmandoExclusao.pdb_id}
              </span>{" "}
              <span className="font-mono text-[13px] text-foreground-subtle">
                ({confirmandoExclusao.formato === "cif" ? "mmCIF" : "legacy"})
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
