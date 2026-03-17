// templates/search/SearchTemplate.tsx
import type { RefObject } from "react";
import DashboardTemplate from "../dashboard/DashboardTemplate";
import { Button } from "../../components/ui/Button";
import { DropdownMenu, Navbar } from "../../components/layout";
import {
  AppLogoIcon,
  ClockIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  SearchIcon,
  WarningIcon,
} from "../../components/icons";
import type { UserModel } from "../../domain/models/auth.model";
import type { PdbResultModel } from "../../domain/models/search.model";
import type { UseDashboardReturn } from "../../hooks/useDashboard";

interface SearchTemplateProps {
  user: UserModel | null;
  input: string;
  setInput: (v: string) => void;
  fase: "idle" | "buscando" | "pausado" | "resultado";
  resultados: PdbResultModel[];
  erroMsg: string;
  proteinas: string[];
  pausado: boolean;
  barraRef: RefObject<HTMLDivElement | null>;
  pctTextoRef: RefObject<HTMLSpanElement | null>;
  contadorRef: RefObject<HTMLSpanElement | null>;
  labelRef: RefObject<HTMLSpanElement | null>;
  coletadasRef: RefObject<HTMLElement | null>;
  protAtualRef: RefObject<HTMLElement | null>;
  menuAberto: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  handleLogout: () => void;
  toggleMenu: () => void;
  irParaHistorico: () => void;
  togglePausa: () => void;
  cancelar: () => void;
  iniciarBusca: (forcarNovo?: boolean) => void;
  resetBusca: () => void;
  dashboard: UseDashboardReturn;
}

export default function SearchTemplate({
  user,
  input,
  setInput,
  fase,
  resultados,
  erroMsg,
  proteinas,
  pausado,
  barraRef,
  pctTextoRef,
  contadorRef,
  labelRef,
  coletadasRef,
  protAtualRef,
  menuAberto,
  menuRef,
  handleLogout,
  toggleMenu,
  irParaHistorico,
  togglePausa,
  cancelar,
  iniciarBusca,
  resetBusca,
  dashboard,
}: SearchTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <span className="inline-flex items-center gap-1.5 text-[17px] font-medium text-foreground-muted">
          <AppLogoIcon size={17} className="text-foreground-muted" />
          PDB<b className="font-extrabold text-foreground">Explorer</b>
        </span>

        <DropdownMenu
          isOpen={menuAberto}
          menuRef={menuRef}
          onToggle={toggleMenu}
          buttonTitle="Menu"
          trigger={<MenuIcon size={25} />}
        >
          <button
            type="button"
            onClick={irParaHistorico}
            className="grid w-full cursor-pointer grid-cols-[16px_1fr] items-center gap-2 border-b border-outline bg-transparent px-4 py-2.5 text-left text-[13px] text-foreground-muted transition-colors hover:bg-surface-primary"
          >
            <span className="inline-flex w-4 justify-start">
              <ClockIcon size={14} />
            </span>
            <span className="text-left">Histórico</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="grid w-full cursor-pointer grid-cols-[16px_1fr] items-center gap-2 bg-transparent px-4 py-2.5 text-left text-[13px] text-foreground-muted transition-colors hover:bg-surface-primary"
          >
            <span className="inline-flex w-4 justify-start">
              <LogoutIcon size={14} />
            </span>
            <span className="text-left">Sair</span>
          </button>
        </DropdownMenu>
      </Navbar>

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-12">
        {fase !== "resultado" && (
          <div className="flex flex-col gap-4">
            {/* Cabeçalho de busca */}
            <div className="text-center mb-2">
              <h1 className="mb-2 text-[32px] font-extrabold tracking-tight text-foreground-muted">
                Buscar Proteínas
              </h1>
              <p className="font-mono text-[14px] text-foreground-subtle">
                Digite uma ou mais proteínas separadas por vírgula
              </p>
            </div>

            {/* Caixa de busca */}
            <div className="overflow-hidden rounded-xl border border-outline bg-panel">
              <textarea
                className="w-full resize-none rounded-none border-none border-b border-outline bg-transparent p-5 font-mono text-[15px] leading-relaxed text-foreground placeholder-foreground-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={"glucan synthase\nFKS1, ERG11, Candida auris"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                disabled={fase === "buscando" || fase === "pausado"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) iniciarBusca();
                }}
              />
              <div className="flex items-center justify-between px-4 py-3 gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-foreground-subtle">
                  Ctrl+Enter para buscar
                </span>
                <div className="flex gap-2">
                  {fase === "idle" && (
                    <Button
                      variant="ghost"
                      onClick={() => iniciarBusca(true)}
                      disabled={!input.trim()}
                      className="px-4 py-2 text-[13px]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <RefreshIcon size={13} /> Forçar novo
                      </span>
                    </Button>
                  )}
                  {(fase === "buscando" || fase === "pausado") && (
                    <>
                      <button
                        onClick={togglePausa}
                        className={`px-4 py-2 text-[13px] font-semibold rounded-lg cursor-pointer border transition-all ${
                          pausado
                            ? "bg-accent-15 border-accent-30 text-accent hover:bg-accent-25"
                            : "bg-yellow-15 border-yellow-30 text-yellow hover:bg-yellow-25"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {pausado ? (
                            <PlayIcon size={12} />
                          ) : (
                            <PauseIcon size={12} />
                          )}
                          {pausado ? "Retomar" : "Pausar"}
                        </span>
                      </button>
                      <button
                        onClick={cancelar}
                        className="cursor-pointer rounded-lg border-none bg-transparent px-3.5 py-2 text-[13px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <CloseIcon size={12} /> Cancelar
                        </span>
                      </button>
                    </>
                  )}
                  {fase === "idle" && (
                    <Button
                      variant="primary"
                      onClick={() => iniciarBusca()}
                      disabled={!input.trim()}
                      className="px-6 py-2"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <SearchIcon size={13} /> Buscar
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Card de progresso */}
            {(fase === "buscando" || fase === "pausado") && (
              <div className="flex flex-col gap-3.5 rounded-xl border border-outline bg-panel px-6 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {pausado ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-25 bg-yellow-12 px-2.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap text-yellow">
                        <PauseIcon size={10} /> Pausado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-25 bg-accent-12 px-2.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap text-accent">
                        <span className="inline-block h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-accent" />
                        Buscando
                      </span>
                    )}
                    <span
                      ref={labelRef}
                      className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px] text-foreground-muted"
                    >
                      Iniciando...
                    </span>
                  </div>
                  <span className="shrink-0 whitespace-nowrap font-mono text-[13px] font-bold text-foreground-muted">
                    <span ref={contadorRef}>0/0</span>
                    <span className="text-accent">
                      {" "}
                      <span ref={pctTextoRef}>0</span>%
                    </span>
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded border border-outline bg-surface-secondary">
                  <div
                    ref={barraRef}
                    className={`h-full rounded transition-[width] duration-[400ms] ${
                      pausado ? "shadow-yellow-glow" : "shadow-accent-glow"
                    }`}
                    style={{
                      width: "2%",
                      background: pausado
                        ? "linear-gradient(90deg, #a07010, var(--color-yellow))"
                        : "linear-gradient(90deg, var(--color-accent-hover), var(--color-accent))",
                      minWidth: 4,
                    }}
                  />
                </div>

                <div className="flex gap-5 font-mono text-[12px] text-foreground-subtle">
                  <span>
                    Coletadas:{" "}
                    <b ref={coletadasRef} className="text-accent">
                      0
                    </b>
                  </span>
                  {proteinas.length > 1 && (
                    <span>
                      Proteína:{" "}
                      <b ref={protAtualRef} className="text-accent">
                        —
                      </b>
                    </span>
                  )}
                </div>
              </div>
            )}

            {erroMsg && (
              <div className="rounded-lg border border-red/20 bg-red/10 px-4 py-3.5 text-[14px] text-red">
                <span className="inline-flex items-center gap-1.5">
                  <WarningIcon size={14} /> {erroMsg}
                </span>
              </div>
            )}
          </div>
        )}

        {fase === "resultado" && (
          <DashboardTemplate
            {...dashboard}
            dados={resultados}
            proteinas={proteinas}
            onNovaBusca={resetBusca}
          />
        )}
      </main>
    </div>
  );
}
