// templates/history/HistoryListTemplate.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  MicroscopeIcon,
  WarningIcon,
} from "../../components/icons";
import { Navbar } from "../../components/layout";
import { useAuth } from "../../contexts/AuthContext";
import { HistoryCard } from "../../components/history/HistoryCard";
import { Pagination } from "../../components/dashboard/Pagination";
import type { UseHistoryListPageReturn } from "../../pages/HistoryListPage/useHistoryListPage";
import type { SearchHistoryItem } from "../../domain/models/history.model";

export default function HistoryListTemplate({
  fase,
  historico,
  erroMsg,
  abrirDetalhe,
  deletarItem,
  handleLogout,
}: UseHistoryListPageReturn) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <div className="flex items-center gap-3">
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
        </div>

        <Button
          variant="ghost"
          onClick={handleLogout}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          Sair
        </Button>
      </Navbar>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 py-10">
        {/* Carregando */}
        {fase === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span className="font-mono text-[13px] text-foreground-subtle">
              Carregando histórico...
            </span>
          </div>
        )}

        {/* Erro */}
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

        {/* Lista */}
        {fase === "lista" && (
          <HistoryList
            historico={historico}
            onAbrir={abrirDetalhe}
            onDeletar={deletarItem}
          />
        )}
      </main>
    </div>
  );
}

const POR_PAGINA = 20;

function HistoryList({
  historico,
  onAbrir,
  onDeletar,
}: {
  historico: SearchHistoryItem[];
  onAbrir: (item: SearchHistoryItem) => void;
  onDeletar: (id: number) => void;
}) {
  const [pagina, setPagina] = useState(1);
  const paginas = Math.ceil(historico.length / POR_PAGINA);
  const inicio = (pagina - 1) * POR_PAGINA;
  const itensPagina = historico.slice(inicio, inicio + POR_PAGINA);

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <ClockIcon size={48} className="text-foreground-subtle opacity-30" />
        <p className="font-mono text-[14px] text-foreground-subtle">
          Nenhuma busca encontrada no histórico.
        </p>
        <p className="max-w-[340px] text-center text-[12px] text-foreground-subtle">
          Buscas são mantidas por 30 dias. Realize uma busca para começar.
        </p>
      </div>
    );
  }

  // Agrupar por data (dia)
  const grupos: Record<string, SearchHistoryItem[]> = {};
  itensPagina.forEach((item) => {
    const dia = item.data_local;
    if (!grupos[dia]) grupos[dia] = [];
    grupos[dia].push(item);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-[22px] font-extrabold text-foreground">
          Histórico de Buscas
        </h1>
        <p className="font-mono text-[13px] text-foreground-subtle">
          {historico.length} {historico.length === 1 ? "busca" : "buscas"} —
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
            return (
              <HistoryCard
                key={item.id}
                comErro={comErro}
                onClick={() => !comErro && onAbrir(item)}
                onDelete={() => onDeletar(item.id)}
                title={
                  comErro
                    ? (item.mensagem_erro ??
                      "Esta busca falhou e não possui resultados para exibir.")
                    : undefined
                }
              >
                <div className="flex flex-1 min-w-0 items-start gap-3">
                  <span
                    className={`shrink-0 mt-px ${comErro ? "opacity-40" : "opacity-50"}`}
                  ></span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold ${
                        comErro ? "text-foreground-muted" : "text-foreground"
                      }`}
                    >
                      {item.proteina_query}
                    </p>
                    <div
                      className={`flex flex-wrap items-center gap-2 ${comErro ? "mb-1.5" : ""}`}
                    >
                      <span className="font-mono text-[11px] text-foreground-subtle">
                        {item.hora_local}
                      </span>
                      {!comErro && (
                        <>
                          <span className="font-mono text-[11px] text-foreground-subtle">
                            ·
                          </span>
                          <span className="font-mono text-[11px] text-foreground-muted">
                            {item.total_resultados} estruturas
                          </span>
                        </>
                      )}
                      {item.veio_do_cache && !comErro && (
                        <span className="rounded bg-accent-12 px-1.5 py-[2px] text-[9px] font-bold tracking-[0.5px] text-accent">
                          CACHE
                        </span>
                      )}
                      {comErro && (
                        <span className="rounded bg-red-12 px-1.5 py-[2px] text-[9px] font-bold uppercase tracking-[0.5px] text-red">
                          ERRO
                        </span>
                      )}
                      {item.organismo_query && !comErro && (
                        <span className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-foreground-subtle">
                          · {item.organismo_query}
                        </span>
                      )}
                    </div>
                    {comErro && (
                      <p className="break-words font-mono text-[12px] leading-relaxed text-red opacity-80">
                        {item.mensagem_erro
                          ? `Falha ao consultar o RCSB PDB: ${item.mensagem_erro.length > 120 ? item.mensagem_erro.slice(0, 120) + "…" : item.mensagem_erro}`
                          : "Não foi possível obter dados do RCSB PDB. Isso pode ocorrer por instabilidade temporária da API externa. Tente refazer a busca."}
                      </p>
                    )}
                  </div>
                </div>
              </HistoryCard>
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
  );
}
