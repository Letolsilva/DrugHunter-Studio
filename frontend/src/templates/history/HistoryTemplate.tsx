// templates/history/HistoryTemplate.tsx
import { useNavigate } from "react-router-dom";
import DashboardTemplate from "../dashboard/DashboardTemplate";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import type { UseHistoryPageReturn } from "../../pages/HistoryPage/useHistoryPage";
import type { SearchHistoryItem } from "../../domain/models/history.model";
import { useAuth } from "../../contexts/AuthContext";

export default function HistoryTemplate({
  fase,
  historico,
  detalhe,
  erroMsg,
  carregando,
  abrirDetalhe,
  voltarLista,
  handleLogout,
}: UseHistoryPageReturn) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 h-14 bg-[var(--bg-2)] border-b border-[var(--border)] sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/search")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-3)",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: "4px 6px",
              borderRadius: "var(--radius)",
              transition: "color 0.15s",
            }}
            title="Voltar à busca"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "var(--text)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-3)")
            }
          >
            ←
          </button>
          <span className="text-[17px] font-medium text-[var(--text-2)]">
            ⬡ PDB<b className="text-[var(--text)] font-extrabold">Explorer</b>
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              borderLeft: "1px solid var(--border)",
              paddingLeft: 12,
              marginLeft: 4,
            }}
          >
            Histórico de Buscas
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[var(--text-2)] flex items-center gap-2">
            {user?.is_admin && (
              <span className="font-mono text-[9px] font-bold bg-[rgba(0,212,170,0.15)] text-[var(--accent)] px-1.5 py-0.5 rounded tracking-widest">
                ADMIN
              </span>
            )}
            {user?.username}
          </span>
          <Button
            variant="ghost"
            onClick={handleLogout}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Sair
          </Button>
        </div>
      </nav>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 py-10">
        {/* Fase: carregando detalhe */}
        {fase === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span
              style={{
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
              }}
            >
              Carregando resultados...
            </span>
          </div>
        )}

        {/* Fase: erro */}
        {fase === "erro" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <span style={{ fontSize: 32 }}>⚠</span>
            <p style={{ color: "var(--red)", fontSize: 14 }}>{erroMsg}</p>
            <Button variant="ghost" onClick={voltarLista}>
              ← Voltar
            </Button>
          </div>
        )}

        {/* Fase: detalhe — exibe dashboard completo */}
        {fase === "detalhe" && detalhe && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={voltarLista}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-3)",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: "6px 10px",
                  borderRadius: "var(--radius)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color =
                    "var(--text-3)")
                }
              >
                ← Voltar ao histórico
              </button>
              <div
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "6px 14px",
                  fontSize: 12,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                📅 {detalhe.data_local} {detalhe.hora_local}
                {detalhe.veio_do_cache && (
                  <span
                    style={{
                      marginLeft: 10,
                      color: "var(--accent)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                    }}
                  >
                    CACHE
                  </span>
                )}
              </div>
            </div>

            <DashboardTemplate
              dados={detalhe.proteinas}
              proteinas={detalhe.proteina_query
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)}
              onNovaBusca={voltarLista}
              inputOriginal={detalhe.proteina_query}
            />
          </div>
        )}

        {/* Fase: lista */}
        {fase === "lista" && (
          <HistoryList
            historico={historico}
            carregando={carregando}
            onAbrir={abrirDetalhe}
          />
        )}
      </main>
    </div>
  );
}

// ── Lista de histórico ────────────────────────────────────────

function HistoryList({
  historico,
  carregando,
  onAbrir,
}: {
  historico: SearchHistoryItem[];
  carregando: boolean;
  onAbrir: (item: SearchHistoryItem) => void;
}) {
  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
        <span
          style={{
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
          }}
        >
          Carregando histórico...
        </span>
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-32">
        <span style={{ fontSize: 48, opacity: 0.3 }}>🕐</span>
        <p
          style={{
            color: "var(--text-3)",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
          }}
        >
          Nenhuma busca encontrada no histórico.
        </p>
        <p
          style={{
            color: "var(--text-3)",
            fontSize: 12,
            textAlign: "center",
            maxWidth: 340,
          }}
        >
          Buscas são mantidas por 30 dias. Realize uma busca para começar.
        </p>
      </div>
    );
  }

  // Agrupar por data (dia)
  const grupos: Record<string, SearchHistoryItem[]> = {};
  historico.forEach((item) => {
    const dia = item.data_local;
    if (!grupos[dia]) grupos[dia] = [];
    grupos[dia].push(item);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: 4,
          }}
        >
          Histórico de Buscas
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {historico.length} {historico.length === 1 ? "busca" : "buscas"} —
          mantidas por 30 dias
        </p>
      </div>

      {Object.entries(grupos).map(([dia, itens]) => (
        <div key={dia} className="flex flex-col gap-2">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-3)",
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              fontFamily: "var(--font-mono)",
              paddingBottom: 6,
              borderBottom: "1px solid var(--border)",
            }}
          >
            📅 {dia}
          </div>
          {itens.map((item) => (
            <HistoryCard key={item.id} item={item} onAbrir={onAbrir} />
          ))}
        </div>
      ))}
    </div>
  );
}

function HistoryCard({
  item,
  onAbrir,
}: {
  item: SearchHistoryItem;
  onAbrir: (item: SearchHistoryItem) => void;
}) {
  const hora = item.hora_local;
  const comErro = item.teve_erro && item.total_resultados === 0;

  return (
    <button
      type="button"
      onClick={() => !comErro && onAbrir(item)}
      disabled={comErro}
      title={
        comErro
          ? (item.mensagem_erro ??
            "Esta busca falhou e não possui resultados para exibir.")
          : undefined
      }
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        width: "100%",
        background: comErro ? "rgba(239,68,68,0.04)" : "var(--card)",
        border: `1px solid ${comErro ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "14px 18px",
        cursor: comErro ? "not-allowed" : "pointer",
        textAlign: "left",
        transition: "border-color 0.15s, background 0.15s",
        opacity: comErro ? 0.8 : 1,
      }}
      onMouseEnter={(e) => {
        if (comErro) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "var(--border-2)";
        el.style.background = "var(--card-2)";
      }}
      onMouseLeave={(e) => {
        if (comErro) return;
        const el = e.currentTarget as HTMLButtonElement;
        el.style.borderColor = "var(--border)";
        el.style.background = "var(--card)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontSize: 20,
            opacity: comErro ? 0.4 : 0.5,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {comErro ? "⚠" : "🔬"}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: comErro ? "var(--text-2)" : "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: 3,
            }}
          >
            {item.proteina_query}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: comErro ? 6 : 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {hora}
            </span>
            {!comErro && (
              <>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-3)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--text-2)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {item.total_resultados} estruturas
                </span>
              </>
            )}
            {item.veio_do_cache && !comErro && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--accent)",
                  background: "rgba(0,212,170,0.12)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  letterSpacing: "0.5px",
                }}
              >
                CACHE
              </span>
            )}
            {comErro && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--red)",
                  background: "rgba(239,68,68,0.12)",
                  padding: "2px 6px",
                  borderRadius: 4,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                ERRO
              </span>
            )}
            {item.organismo_query && !comErro && (
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-mono)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 200,
                }}
              >
                · {item.organismo_query}
              </span>
            )}
          </div>
          {comErro && (
            <p
              style={{
                fontSize: 12,
                color: "var(--red)",
                opacity: 0.8,
                fontFamily: "var(--font-mono)",
                lineHeight: 1.5,
                wordBreak: "break-word",
              }}
            >
              {item.mensagem_erro
                ? `Falha ao consultar o RCSB PDB: ${item.mensagem_erro.length > 120 ? item.mensagem_erro.slice(0, 120) + "…" : item.mensagem_erro}`
                : "Não foi possível obter dados do RCSB PDB. Isso pode ocorrer por instabilidade temporária da API externa. Tente refazer a busca."}
            </p>
          )}
        </div>
      </div>
      {!comErro && (
        <span
          style={{
            fontSize: 16,
            color: "var(--text-3)",
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          →
        </span>
      )}
    </button>
  );
}
