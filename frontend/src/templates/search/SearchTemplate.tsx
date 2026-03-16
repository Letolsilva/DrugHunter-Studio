// templates/search/SearchTemplate.tsx
import type { RefObject } from "react";
import DashboardTemplate from "../dashboard/DashboardTemplate";
import { Button } from "../../components/ui/Button";
import type { UserModel } from "../../domain/models/auth.model";
import type { PdbResultModel } from "../../domain/models/search.model";

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
  handleLogout: () => void;
  togglePausa: () => void;
  cancelar: () => void;
  iniciarBusca: (forcarNovo?: boolean) => void;
  resetBusca: () => void;
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
  handleLogout,
  togglePausa,
  cancelar,
  iniciarBusca,
  resetBusca,
}: SearchTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 h-14 bg-[var(--bg-2)] border-b border-[var(--border)] sticky top-0 z-[100]">
        <span className="text-[17px] font-medium text-[var(--text-2)]">
          ⬡ PDB<b className="text-[var(--text)] font-extrabold">Explorer</b>
        </span>
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

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 py-12">
        {fase !== "resultado" && (
          <div className="flex flex-col gap-4">
            {/* Cabeçalho de busca */}
            <div className="text-center mb-2">
              <h1 className="text-[32px] font-extrabold text-[var(--text)] tracking-tight mb-2">
                Buscar Proteínas
              </h1>
              <p className="text-[14px] text-[var(--text-3)] font-mono">
                Digite uma ou mais proteínas separadas por vírgula
              </p>
            </div>

            {/* Caixa de busca */}
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <textarea
                className="w-full bg-transparent border-none border-b border-[var(--border)] rounded-none p-5 text-[15px] font-mono resize-none text-[var(--text)] leading-relaxed placeholder-[var(--text-3)] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ outline: "none", boxShadow: "none" }}
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
                <span className="text-[11px] text-[var(--text-3)] font-mono">
                  Ctrl+Enter para buscar
                </span>
                <div className="flex gap-2">
                  {fase === "idle" && (
                    <Button
                      variant="ghost"
                      onClick={() => iniciarBusca(true)}
                      disabled={!input.trim()}
                      style={{ fontSize: 13, padding: "8px 16px" }}
                    >
                      ↺ Forçar novo
                    </Button>
                  )}
                  {(fase === "buscando" || fase === "pausado") && (
                    <>
                      <button
                        onClick={togglePausa}
                        className={`px-4 py-2 text-[13px] font-semibold rounded-lg cursor-pointer border transition-all ${
                          pausado
                            ? "bg-[rgba(0,212,170,0.15)] border-[rgba(0,212,170,0.3)] text-[var(--accent)] hover:bg-[rgba(0,212,170,0.25)]"
                            : "bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)] text-[var(--yellow)] hover:bg-[rgba(245,158,11,0.25)]"
                        }`}
                      >
                        {pausado ? "▶ Retomar" : "⏸ Pausar"}
                      </button>
                      <button
                        onClick={cancelar}
                        className="bg-transparent border-none text-[#9ca3af] px-3.5 py-2 text-[13px] font-semibold rounded-lg cursor-pointer transition-colors hover:text-[#d1d5db]"
                      >
                        ✕ Cancelar
                      </button>
                    </>
                  )}
                  {fase === "idle" && (
                    <Button
                      variant="primary"
                      onClick={() => iniciarBusca()}
                      disabled={!input.trim()}
                      style={{ padding: "8px 24px" }}
                    >
                      🔍 Buscar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Card de progresso */}
            {(fase === "buscando" || fase === "pausado") && (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-6 py-5 flex flex-col gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {pausado ? (
                      <span className="inline-flex items-center gap-1.5 bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.25)] text-[var(--yellow)] px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap font-mono">
                        ⏸ Pausado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-[rgba(0,212,170,0.12)] border border-[rgba(0,212,170,0.25)] text-[var(--accent)] px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap font-mono">
                        <span className="w-[7px] h-[7px] rounded-full bg-[var(--accent)] animate-pulse inline-block flex-shrink-0" />
                        Buscando
                      </span>
                    )}
                    <span
                      ref={labelRef}
                      className="text-[12px] font-mono text-[var(--text-2)] overflow-hidden text-ellipsis whitespace-nowrap"
                    >
                      Iniciando...
                    </span>
                  </div>
                  <span className="font-mono text-[13px] text-[var(--text-2)] font-bold whitespace-nowrap flex-shrink-0">
                    <span ref={contadorRef}>0/0</span>
                    <span className="text-[var(--accent)]">
                      {" "}
                      <span ref={pctTextoRef}>0</span>%
                    </span>
                  </span>
                </div>

                <div className="h-2 bg-[var(--bg-2)] rounded border border-[var(--border)] overflow-hidden">
                  <div
                    ref={barraRef}
                    className="h-full rounded transition-[width] duration-[400ms]"
                    style={{
                      width: "2%",
                      background: pausado
                        ? "linear-gradient(90deg, #a07010, var(--yellow))"
                        : "linear-gradient(90deg, var(--accent-hover), var(--accent))",
                      boxShadow: pausado
                        ? "0 0 10px rgba(245,158,11,0.3)"
                        : "0 0 10px rgba(0,212,170,0.3)",
                      minWidth: 4,
                    }}
                  />
                </div>

                <div className="flex gap-5 text-[12px] text-[var(--text-3)] font-mono">
                  <span>
                    Coletadas:{" "}
                    <b ref={coletadasRef} className="text-[var(--accent)]">
                      0
                    </b>
                  </span>
                  {proteinas.length > 1 && (
                    <span>
                      Proteína:{" "}
                      <b ref={protAtualRef} className="text-[var(--accent)]">
                        —
                      </b>
                    </span>
                  )}
                </div>
              </div>
            )}

            {erroMsg && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3.5 text-[var(--red)] text-[14px]">
                ⚠ {erroMsg}
              </div>
            )}
          </div>
        )}

        {fase === "resultado" && (
          <DashboardTemplate
            dados={resultados}
            proteinas={proteinas}
            onNovaBusca={resetBusca}
            inputOriginal={input}
          />
        )}
      </main>
    </div>
  );
}
