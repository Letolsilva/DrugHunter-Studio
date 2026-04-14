// pages/SearchPage/useSearchPage.ts
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type RefObject,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { SearchUseCase } from "../../data/usecases/search.usecase";
import type { DashboardUseCase } from "../../data/usecases/dashboard.usecase";
import type {
  PdbResultModel,
  SearchEventModel,
} from "../../domain/models/search.model";
import type { UserModel } from "../../domain/models/auth.model";
import {
  useDashboard,
  type UseDashboardReturn,
} from "../../hooks/useDashboard";

type Fase = "idle" | "buscando" | "resultado";

export interface UseSearchPageReturn {
  user: UserModel | null;
  input: string;
  setInput: (v: string) => void;
  fase: Fase;
  resultados: PdbResultModel[];
  erroMsg: string;
  proteinas: string[];
  limiteEscolhido: number | null;
  setLimiteEscolhido: (v: number | null) => void;
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
  irParaMeusPdbs: () => void;
  irParaRedocking: () => void;
  pausar: () => void;
  cancelar: () => void;
  iniciarBusca: (forcarNovo?: boolean) => void;
  resetBusca: () => void;
  dashboard: UseDashboardReturn;
}

export function useSearchPage(
  searchUseCase: SearchUseCase,
  dashboardUseCase: DashboardUseCase,
): UseSearchPageReturn {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [fase, setFase] = useState<Fase>("idle");
  const [resultados, setResultados] = useState<PdbResultModel[]>([]);
  const [erroMsg, setErroMsg] = useState("");
  const [proteinas, setProteinas] = useState<string[]>([]);
  const [limiteEscolhido, setLimiteEscolhido] = useState<number | null>(50);
  const [menuAberto, setMenuAberto] = useState(false);

  const esRef = useRef<EventSource | null>(null);
  const inputBuscaRef = useRef("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const barraRef = useRef<HTMLDivElement | null>(null);
  const pctTextoRef = useRef<HTMLSpanElement | null>(null);
  const contadorRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const coletadasRef = useRef<HTMLElement | null>(null);
  const protAtualRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!menuAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [menuAberto]);

  const handleLogout = useCallback(() => {
    setMenuAberto(false);
    logout();
    navigate("/");
  }, [logout, navigate]);

  const toggleMenu = useCallback(() => {
    setMenuAberto((v) => !v);
  }, []);

  const irParaHistorico = useCallback(() => {
    setMenuAberto(false);
    navigate("/historico");
  }, [navigate]);

  const irParaMeusPdbs = useCallback(() => {
    setMenuAberto(false);
    navigate("/meus-pdbs");
  }, [navigate]);

  const irParaRedocking = useCallback(() => {
    setMenuAberto(false);
    navigate("/redocking");
  }, [navigate]);

  const atualizarBarra = useCallback(
    (atual: number, total: number, label?: string) => {
      const pct = total > 0 ? Math.round((atual / total) * 100) : 0;
      if (barraRef.current)
        barraRef.current.style.width = `${Math.max(pct, 2)}%`;
      if (pctTextoRef.current) pctTextoRef.current.textContent = `${pct}%`;
      if (contadorRef.current)
        contadorRef.current.textContent = `${atual}/${total}`;
      if (labelRef.current) labelRef.current.textContent = label ?? "";
    },
    [],
  );

  const processar = useCallback(
    (ev: SearchEventModel) => {
      if (ev.tipo === "cache_hit") {
        atualizarBarra(ev.total ?? 0, ev.total ?? 0, "Carregando do cache...");
      } else if (ev.tipo === "lista_proteinas") {
        // proteinas já foram definidas a partir do input em iniciarBusca
      } else if (ev.tipo === "inicio_proteina") {
        if (protAtualRef.current)
          protAtualRef.current.textContent = ev.proteina ?? "";
        atualizarBarra(0, 1, `Buscando IDs de "${ev.proteina}"...`);
      } else if (ev.tipo === "ids_encontrados") {
        atualizarBarra(
          0,
          ev.total_ids ?? 0,
          `${ev.total_ids} estruturas encontradas — "${ev.proteina}"`,
        );
      } else if (ev.tipo === "progresso") {
        atualizarBarra(ev.atual ?? 0, ev.total ?? 0, ev.pdb_id);
      } else if (ev.tipo === "resultado") {
        setResultados((prev) => {
          const novo = [...prev, ev.dado!];
          if (coletadasRef.current)
            coletadasRef.current.textContent = String(novo.length);
          return novo;
        });
      } else if (ev.tipo === "fim") {
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        setFase("resultado");
      } else if (ev.tipo === "erro_proteina" || ev.tipo === "erro") {
        setErroMsg(ev.mensagem ?? "");
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        setFase("idle");
      }
    },
    [atualizarBarra],
  );

  const pausar = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setFase("resultado");
  }, []);

  const cancelar = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setFase("idle");
    setResultados([]);
    if (inputBuscaRef.current) {
      const token = localStorage.getItem("access_token") ?? "";
      searchUseCase.cancelarParcial(inputBuscaRef.current, token);
      inputBuscaRef.current = "";
    }
  }, [searchUseCase]);

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
      setProteinas(
        input
          .trim()
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      );
      inputBuscaRef.current = input.trim();

      const token = localStorage.getItem("access_token") ?? "";
      const es = searchUseCase.createStream(
        input.trim(),
        token,
        forcarNovo,
        limiteEscolhido,
      );
      esRef.current = es;

      es.onmessage = (e) => {
        const ev = searchUseCase.adaptEvent(
          JSON.parse(e.data) as SearchEventModel,
        );
        processar(ev);
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
    [input, processar, searchUseCase, limiteEscolhido],
  );

  const resetBusca = useCallback(() => {
    setFase("idle");
    setResultados([]);
  }, []);

  const dashboard = useDashboard(resultados, dashboardUseCase);

  return {
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
    irParaHistorico,
    irParaMeusPdbs,
    irParaRedocking,
    pausar,
    cancelar,
    iniciarBusca,
    resetBusca,
    dashboard,
  };
}
