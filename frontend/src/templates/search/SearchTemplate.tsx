// templates/search/SearchTemplate.tsx
import type { RefObject, Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import DashboardTemplate from "../dashboard/DashboardTemplate";
import { Button } from "../../components/ui/Button";
import { DropdownSelect } from "../../components/ui/DropdownSelect";
import { SearchBox } from "../../components/ui/searchbox";
import { ProgressCard } from "../../components/search/ProgressCard";
import { DropdownMenu, Navbar } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import { Pagination } from "../../components/dashboard/Pagination";
import { HistoryItemCard } from "../../components/history/historycard";
import { HistoryItemCardError } from "../../components/history/HistoryItemCardError";
import {
  AppLogoIcon,
  CalendarIcon,
  ClockIcon,
  CloseIcon,
  DownloadIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  PauseIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  WarningIcon,
} from "../../components/icons";
import type { UserModel } from "../../domain/models/auth.model";
import type { PdbResultModel } from "../../domain/models/search.model";
import type { SearchHistoryItem } from "../../domain/models/history.model";
import type { UseDashboardReturn } from "../../hooks/useDashboard";
import type { UseSearchPageReturn } from "../../pages/SearchPage/useSearchPage";

export default function SearchTemplate({
  user,
  input,
  setInput,
  fase,
  resultados,
  erroMsg,
  proteinas,
  limiteEscolhido,
  setLimiteEscolhido,
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
  irParaMeusPdbs,
  irParaRedocking,
  irParaConfiguracoes,
  irParaAjuda,
  pausar,
  cancelar,
  iniciarBusca,
  resetBusca,
  dashboard,
  historico,
  historicoLoading,
  grupos,
  historicoPagina,
  historicoPaginas,
  setHistoricoPagina,
  abrirHistoricoItem,
  deletarHistoricoItem,
}: UseSearchPageReturn) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="cursor-pointer rounded border-none bg-transparent inline-flex items-center gap-1.5 text-[17px] font-medium text-foreground-muted hover:text-foreground transition-colors"
            title="Início"
          >
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="font-extrabold text-foreground">Explorer</b>
          </button>
        </Navbar.Left>

        <Navbar.Middle>
          <MiddleBar activeModule="pdb" />
        </Navbar.Middle>

        <Navbar.Right>
          <button
            type="button"
            onClick={irParaMeusPdbs}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Meus PDBs
          </button>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={toggleMenu}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<RefreshIcon size={14} />}
              label="Redocking"
              onClick={() => { toggleMenu(); irParaRedocking(); }}
              divider
            />
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => { toggleMenu(); irParaConfiguracoes(); }}
              divider
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={() => { toggleMenu(); irParaAjuda(); }}
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

      <main className="mx-auto w-full max-w-350 flex-1 px-8 py-12">
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
              {fase === "idle" && (
                <div className="mt-3 inline-flex items-center gap-2 text-[13px] text-foreground-subtle">
                  <span>Máximo de estruturas por proteína:</span>
                  <div className="w-28">
                    <DropdownSelect
                      value={limiteEscolhido === null ? "all" : String(limiteEscolhido)}
                      onChange={(v) => setLimiteEscolhido(v === "all" ? null : Number(v))}
                      options={[
                        { value: "10", label: "10" },
                        { value: "25", label: "25" },
                        { value: "50", label: "50" },
                        { value: "100", label: "100" },
                        { value: "200", label: "200" },
                        { value: "all", label: "Todas" },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Caixa de busca */}
            <SearchBox>
              <SearchBox.TextArea
                value={input}
                onChange={setInput}
                onSubmit={() => iniciarBusca()}
                placeholder={"glucan synthase\nFKS1, ERG11, Candida auris"}
                disabled={fase === "buscando"}
              />
              <SearchBox.Footer>
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
                {fase === "buscando" && (
                  <>
                    <button
                      onClick={pausar}
                      className="px-4 py-2 text-[13px] font-semibold rounded-lg cursor-pointer border transition-all bg-yellow-15 border-yellow-30 text-yellow hover:bg-yellow-25"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <PauseIcon size={12} />
                        Pausar
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
              </SearchBox.Footer>
            </SearchBox>

            {/* Card de progresso */}
            {fase === "buscando" && (
              <ProgressCard
                pausado={false}
                proteinas={proteinas}
                labelRef={labelRef}
                contadorRef={contadorRef}
                pctTextoRef={pctTextoRef}
                barraRef={barraRef}
                coletadasRef={coletadasRef}
                protAtualRef={protAtualRef}
              />
            )}

            {erroMsg && (
              <div className="rounded-lg border border-red/20 bg-red/10 px-4 py-3.5 text-[14px] text-red">
                <span className="inline-flex items-center gap-1.5">
                  <WarningIcon size={14} /> {erroMsg}
                </span>
              </div>
            )}

            {/* ── Histórico de buscas (apenas quando idle) ────────────── */}
            {fase === "idle" && (
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle flex items-center gap-1.5">
                    <ClockIcon size={12} /> Histórico de Buscas
                    {historico.length > 0 && (
                      <span className="ml-1 normal-case">
                        — {historico.length} {historico.length === 1 ? "busca" : "buscas"}
                      </span>
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={irParaMeusPdbs}
                    className="cursor-pointer rounded border border-outline px-3 py-1 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors flex items-center gap-1.5"
                  >
                    <DownloadIcon size={11} /> Meus PDBs
                  </button>
                </div>

                {historicoLoading ? (
                  <div className="flex justify-center py-10">
                    <Spinner style={{ width: 24, height: 24, borderWidth: 2 }} />
                  </div>
                ) : historico.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-12">
                    <ClockIcon size={40} className="text-foreground-subtle opacity-25" />
                    <p className="font-mono text-[13px] text-foreground-subtle">
                      Nenhuma busca encontrada.
                    </p>
                    <p className="text-center text-[12px] text-foreground-subtle max-w-72">
                      Buscas são mantidas por 30 dias. Realize uma busca para começar.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {Object.entries(grupos).map(([dia, itens]) => (
                      <div key={dia} className="flex flex-col gap-2">
                        <div className="border-b border-outline pb-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.6px] text-foreground-subtle">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarIcon size={12} /> {dia}
                          </span>
                        </div>
                        {itens.map((item) => {
                          const comErro = item.teve_erro && item.total_resultados === 0;
                          if (comErro) {
                            return (
                              <HistoryItemCardError
                                key={item.id}
                                item={item}
                                onDelete={() => deletarHistoricoItem(item.id)}
                              />
                            );
                          }
                          return (
                            <HistoryItemCard
                              key={item.id}
                              onClick={() => abrirHistoricoItem(item)}
                              onDelete={() => deletarHistoricoItem(item.id)}
                            >
                              <div className="min-w-0 flex-1">
                                <HistoryItemCard.Title>{item.proteina_query}</HistoryItemCard.Title>
                                <HistoryItemCard.Details>
                                  <span className="font-mono text-[11px] text-foreground-subtle">
                                    {item.hora_local}
                                  </span>
                                  <span className="font-mono text-[11px] text-foreground-muted">
                                    {item.total_resultados} estruturas
                                  </span>
                                  {item.veio_do_cache && (
                                    <span className="rounded bg-accent-12 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.5px] text-accent">
                                      CACHE
                                    </span>
                                  )}
                                  {item.organismo_query && (
                                    <span className="max-w-50 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-foreground-subtle">
                                      {item.organismo_query}
                                    </span>
                                  )}
                                </HistoryItemCard.Details>
                              </div>
                            </HistoryItemCard>
                          );
                        })}
                      </div>
                    ))}
                    <Pagination
                      pagina={historicoPagina}
                      paginas={historicoPaginas}
                      onPrev={() => setHistoricoPagina((p) => p - 1)}
                      onNext={() => setHistoricoPagina((p) => p + 1)}
                    />
                  </div>
                )}
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
