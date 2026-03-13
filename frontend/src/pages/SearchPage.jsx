// pages/SearchPage.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Dashboard from "../components/dashboard/Dashboard";
import styles from "./SearchPage.module.css";

const API_BASE = "/api";

async function limparCacheParcial(proteinas_query) {
  try {
    const token = localStorage.getItem("access_token") || "";
    await fetch(`${API_BASE}/search/cancelar-parcial`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ proteinas_query }),
    });
  } catch (_) {}
}

export default function SearchPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [fase, setFase] = useState("idle");
  const [resultados, setResultados] = useState([]);
  const [erroMsg, setErroMsg] = useState("");
  const [proteinas, setProteinas] = useState([]);
  const [pausado, setPausado] = useState(false);

  // Refs para atualização direta do DOM (sem batching do React)
  const esRef = useRef(null);
  const pausadoRef = useRef(false);
  const bufferRef = useRef([]);
  const inputBuscaRef = useRef("");

  // Refs dos elementos DOM da barra — atualizados diretamente
  const barraRef = useRef(null);
  const pctTextoRef = useRef(null);
  const contadorRef = useRef(null);
  const labelRef = useRef(null);
  const coletadasRef = useRef(null);
  const protAtualRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Atualiza barra diretamente no DOM — sem setState, sem batching
  const atualizarBarra = useCallback((atual, total, label, pdb_id) => {
    const pct = total > 0 ? Math.round((atual / total) * 100) : 0;
    if (barraRef.current) barraRef.current.style.width = `${Math.max(pct, 2)}%`;
    if (pctTextoRef.current) pctTextoRef.current.textContent = `${pct}%`;
    if (contadorRef.current)
      contadorRef.current.textContent = `${atual}/${total}`;
    if (labelRef.current) labelRef.current.textContent = label || "";
  }, []);

  // Processar evento SSE
  const processar = useCallback(
    (ev) => {
      if (ev.tipo === "cache_hit") {
        atualizarBarra(ev.total, ev.total, "Carregando do cache...", "");
      } else if (ev.tipo === "lista_proteinas") {
        setProteinas(ev.proteinas);
      } else if (ev.tipo === "inicio_proteina") {
        if (protAtualRef.current)
          protAtualRef.current.textContent = ev.proteina;
        atualizarBarra(0, 1, `Buscando IDs de "${ev.proteina}"...`, "");
      } else if (ev.tipo === "ids_encontrados") {
        atualizarBarra(
          0,
          ev.total_ids,
          `${ev.total_ids} estruturas encontradas — "${ev.proteina}"`,
          "",
        );
      } else if (ev.tipo === "progresso") {
        atualizarBarra(ev.atual, ev.total, `${ev.pdb_id}`, ev.pdb_id);
      } else if (ev.tipo === "resultado") {
        setResultados((prev) => {
          const novo = [...prev, ev.dado];
          if (coletadasRef.current)
            coletadasRef.current.textContent = novo.length;
          return novo;
        });
      } else if (ev.tipo === "fim") {
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        pausadoRef.current = false;
        bufferRef.current = [];
        setPausado(false);
        setFase("resultado");
      } else if (ev.tipo === "erro_proteina" || ev.tipo === "erro") {
        setErroMsg(ev.mensagem);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        setFase("idle");
      }
    },
    [atualizarBarra],
  );

  // Pausar / Retomar
  const togglePausa = useCallback(() => {
    const novoPausado = !pausadoRef.current;
    pausadoRef.current = novoPausado;
    setPausado(novoPausado);

    if (!novoPausado && bufferRef.current.length > 0) {
      bufferRef.current.forEach(processar);
      bufferRef.current = [];
    }
  }, [processar]);

  // Cancelar
  const cancelar = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    pausadoRef.current = false;
    bufferRef.current = [];
    setPausado(false);
    setFase("idle");
    setResultados([]);
    if (inputBuscaRef.current) {
      limparCacheParcial(inputBuscaRef.current);
      inputBuscaRef.current = "";
    }
  }, []);

  // Iniciar busca
  const iniciarBusca = useCallback(
    (forcarNovo = false) => {
      if (!input.trim()) return;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      setFase("buscando");
      setResultados([]);
      setErroMsg("");
      setProteinas([]);
      setPausado(false);
      pausadoRef.current = false;
      bufferRef.current = [];
      inputBuscaRef.current = input.trim();

      const token = localStorage.getItem("access_token") || "";
      const params = new URLSearchParams({ proteinas: input.trim() });
      if (forcarNovo) params.set("forcar_novo", "true");
      if (token) params.set("token", token);

      const es = new EventSource(`${API_BASE}/search/stream?${params}`);
      esRef.current = es;

      es.onmessage = (e) => {
        const ev = JSON.parse(e.data);
        if (pausadoRef.current) {
          if (ev.tipo === "resultado") {
            setResultados((prev) => {
              const novo = [...prev, ev.dado];
              if (coletadasRef.current)
                coletadasRef.current.textContent = novo.length;
              return novo;
            });
          } else {
            bufferRef.current.push(ev);
          }
        } else {
          processar(ev);
        }
      };

      es.onerror = () => {
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        setErroMsg("Conexão perdida com o servidor.");
        setFase("idle");
      };
    },
    [input, processar],
  );

  return (
    <div className={styles.page}>
      {/* Navbar */}
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <span className={styles.navLogo}>
            ⬡ PDB<b>Explorer</b>
          </span>
        </div>
        <div className={styles.navRight}>
          <span className={styles.navUser}>
            {user?.is_admin && <span className={styles.adminBadge}>ADMIN</span>}
            {user?.username}
          </span>
          <button
            className="btn-ghost"
            onClick={handleLogout}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Sair
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        {fase !== "resultado" && (
          <div className={styles.searchArea}>
            <div className={styles.searchHeader}>
              <h1 className={styles.title}>Buscar Proteínas</h1>
              <p className={styles.subtitle}>
                Digite uma ou mais proteínas separadas por vírgula
              </p>
            </div>

            <div className={styles.searchBox}>
              <textarea
                className={styles.textarea}
                placeholder={"glucan synthase\nFKS1, ERG11, Candida auris"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                disabled={fase === "buscando" || fase === "pausado"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) iniciarBusca();
                }}
              />
              <div className={styles.searchActions}>
                <span className={styles.hint}>Ctrl+Enter para buscar</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {fase === "idle" && (
                    <button
                      className="btn-ghost"
                      onClick={() => iniciarBusca(true)}
                      disabled={!input.trim()}
                      style={{ fontSize: 13, padding: "8px 16px" }}
                    >
                      ↺ Forçar novo
                    </button>
                  )}
                  {(fase === "buscando" || fase === "pausado") && (
                    <>
                      <button
                        className={
                          pausado ? styles.btnRetomar : styles.btnPausar
                        }
                        onClick={togglePausa}
                      >
                        {pausado ? "▶ Retomar" : "⏸ Pausar"}
                      </button>
                      <button onClick={cancelar} className={styles.btnCancelar}>
                        ✕ Cancelar
                      </button>
                    </>
                  )}
                  {fase === "idle" && (
                    <button
                      className="btn-primary"
                      onClick={() => iniciarBusca()}
                      disabled={!input.trim()}
                      style={{ padding: "8px 24px" }}
                    >
                      🔍 Buscar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Barra de progresso — DOM direto via refs */}
            {(fase === "buscando" || fase === "pausado") && (
              <div className={styles.progressCard}>
                <div className={styles.progressTop}>
                  <div className={styles.progressStatus}>
                    {pausado ? (
                      <span className={styles.pillPausado}>⏸ Pausado</span>
                    ) : (
                      <span className={styles.pillBuscando}>
                        <span className={styles.dot} /> Buscando
                      </span>
                    )}
                    <span ref={labelRef} className={styles.progressLabel}>
                      Iniciando...
                    </span>
                  </div>
                  <span className={styles.progressCount}>
                    <span ref={contadorRef}>0/0</span>
                    <span className={styles.progressPct}>
                      {" "}
                      <span ref={pctTextoRef}>0</span>%
                    </span>
                  </span>
                </div>

                <div className={styles.progressBar}>
                  <div
                    ref={barraRef}
                    className={
                      styles.progressFill +
                      (pausado ? " " + styles.progressPausado : "")
                    }
                  />
                </div>

                <div className={styles.progressStats}>
                  <span>
                    Coletadas: <b ref={coletadasRef}>0</b>
                  </span>
                  {proteinas.length > 1 && (
                    <span>
                      Proteína: <b ref={protAtualRef}>—</b>
                    </span>
                  )}
                </div>
              </div>
            )}

            {erroMsg && <div className={styles.erro}>⚠ {erroMsg}</div>}
          </div>
        )}

        {fase === "resultado" && (
          <Dashboard
            dados={resultados}
            proteinas={proteinas}
            onNovaBusca={() => {
              setFase("idle");
              setResultados([]);
            }}
            inputOriginal={input}
          />
        )}
      </main>
    </div>
  );
}
