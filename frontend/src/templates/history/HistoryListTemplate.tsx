// templates/history/HistoryListTemplate.tsx
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  WarningIcon,
} from "../../components/icons";
import { Navbar } from "../../components/layout";
import { Pagination } from "../../components/dashboard/Pagination";
import { HistoryItemCard } from "../../components/history/historycard";
import { HistoryItemCardError } from "../../components/history/HistoryItemCardError";
import type { UseHistoryListPageReturn } from "../../pages/HistoryListPage/useHistoryListPage";

export default function HistoryListTemplate({
  fase,
  historico,
  erroMsg,
  abrirDetalhe,
  deletarItem,
  handleLogout,
  irParaMeusPdbs,
  pagina,
  paginas,
  grupos,
  setPagina,
}: UseHistoryListPageReturn) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary select-none">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Voltar à busca"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
          <span className="ml-1 border-l border-outline pl-3 font-mono text-[12px] text-foreground-subtle">
            Histórico de Buscas
          </span>
        </Navbar.Left>

        <Navbar.Right>
          <button
            type="button"
            onClick={irParaMeusPdbs}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Meus PDBs
          </button>
          <button
            type="button"
            onClick={() => navigate("/redocking")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Redocking
          </button>
          <button
            type="button"
            onClick={() => navigate("/configuracoes")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Configurações
          </button>
          <button
            type="button"
            onClick={() => navigate("/ajuda")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Ajuda
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

      <main className="flex-1 max-w-350 w-full mx-auto px-8 py-10">
        {fase === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span className="font-mono text-[13px] text-foreground-subtle">
              Carregando histórico...
            </span>
          </div>
        )}

        {fase === "erro" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <WarningIcon size={32} className="text-red" />
            <p className="text-[14px] text-red">{erroMsg}</p>
            <Button variant="ghost" onClick={() => navigate("/search")}>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <ArrowLeftIcon size={14} /> Voltar à busca
              </span>
            </Button>
          </div>
        )}

        {fase === "lista" && historico.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <ClockIcon
              size={48}
              className="text-foreground-subtle opacity-30"
            />
            <p className="font-mono text-[14px] text-foreground-subtle">
              Nenhuma busca encontrada no histórico.
            </p>
            <p className="max-w-85 text-center text-[12px] text-foreground-subtle">
              Buscas são mantidas por 30 dias. Realize uma busca para começar.
            </p>
          </div>
        )}

        {fase === "lista" && historico.length > 0 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="mb-1 text-[22px] font-extrabold text-foreground">
                Histórico de Buscas
              </h1>
              <p className="font-mono text-[13px] text-foreground-subtle">
                {historico.length} {historico.length === 1 ? "busca" : "buscas"}{" "}
                mantidas por 30 dias
              </p>
            </div>

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
                        onDelete={() => deletarItem(item.id)}
                      />
                    );
                  }

                  return (
                    <HistoryItemCard
                      key={item.id}
                      onClick={() => abrirDetalhe(item)}
                      onDelete={() => deletarItem(item.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <HistoryItemCard.Title>
                          {item.proteina_query}
                        </HistoryItemCard.Title>
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
              pagina={pagina}
              paginas={paginas}
              onPrev={() => setPagina((p) => p - 1)}
              onNext={() => setPagina((p) => p + 1)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
