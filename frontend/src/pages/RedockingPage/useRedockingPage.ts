// pages/RedockingPage/useRedockingPage.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useRedocking } from "../../contexts/RedockingContext";
import type { RedockingUseCase } from "../../data/usecases/redocking.usecase";
import type {
  CsvLinha,
  ProntidaoResponse,
  RedockingJobModel,
} from "../../domain/models/redocking.model";

export type ChargeType = "am1" | "gas";

// Re-exporta CsvLinha para que o template continue importando daqui
export type { CsvLinha };

/**
 * Normaliza o nome do alvo para uso seguro em caminhos e shell.
 * Espelha exatamente a lógica de backend/app/domain/utils/normalizacao.py:
 * - Remove acentos (NFD → ASCII)
 * - Remove espaços (igual ao DrugHunter)
 * - Mantém apenas [A-Za-z0-9_-]
 */
function normalizarTarget(nome: string): string {
  const semAcentos = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return semAcentos.replace(/[^A-Za-z0-9_-]/g, "");
}

export interface ChartDatum {
  name: string;
  value: number;
}

export interface RedockingDashboard {
  total: number;
  ligantesUnicos: number;
  resolucaoMedia: string;
  cadeiaUnicas: number;
  resolucaoFaixas: ChartDatum[];
  topLigantes: ChartDatum[];
  porCadeia: ChartDatum[];
}

export interface UseRedockingPageReturn {
  csvLinhas: CsvLinha[];
  csvFileName: string;
  dashboard: RedockingDashboard | null;
  config: {
    target: string;
    base_input_path: string;
    base_output_path: string;
    charge_type: ChargeType;
  };
  /** Nome do alvo após normalização (apenas [A-Za-z0-9_-]). */
  targetNormalizado: string;
  /** True quando o nome digitado foi modificado pela normalização. */
  targetAjustado: boolean;
  /** Estado de prontidão dos arquivos .pdb na pasta do alvo. */
  prontidao: ProntidaoResponse | null;
  /** True enquanto a preparação automática está em curso. */
  preparando: boolean;
  submitting: boolean;
  jobs: RedockingJobModel[];
  userEmail: string;
  menuAberto: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  toast: string | null;
  toastVariant: "success" | "error";
  toggleMenu: () => void;
  irParaBusca: () => void;
  irParaHistorico: () => void;
  irParaMeusPdbs: () => void;
  irParaConfiguracoes: () => void;
  handleImportarCsv: (file: File) => void;
  handleConfigChange: (field: string, value: string) => void;
  handleVerificarProntidao: () => Promise<void>;
  handlePreparar: () => Promise<void>;
  handleSubmit: () => Promise<void>;
  handleLogout: () => void;
}

export function useRedockingPage(
  redockingUseCase: RedockingUseCase,
): UseRedockingPageReturn {
  const { logout, user } = useAuth();
  const {
    activeJob,
    setActiveJob,
    csvLinhas,
    csvFileName,
    salvarCsvNoServidor,
    carregarCsvDoServidor,
  } = useRedocking();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [prontidao, setProntidao] = useState<ProntidaoResponse | null>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prevJobStatusRef = useRef<string | null>(null);
  const [jobs, setJobs] = useState<RedockingJobModel[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">(
    "error",
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (msg: string, variant: "success" | "error" = "error") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastVariant(variant);
      setToast(msg);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    },
    [],
  );
  const [config, setConfig] = useState({
    target: localStorage.getItem("redocking_target") ?? "",
    base_input_path: localStorage.getItem("redocking_base_input_path") ?? "",
    base_output_path: "",
    charge_type: "am1" as ChargeType,
  });

  // Ao montar: carrega jobs, defaults do servidor e CSV em memória
  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    redockingUseCase
      .listarJobs(token)
      .then(setJobs)
      .catch(() => {});
    redockingUseCase
      .buscarDefaults(token)
      .then((d) => {
        setConfig((prev) => ({
          ...prev,
          ...(prev.base_input_path === ""
            ? { base_input_path: d.base_input_path }
            : {}),
          ...(prev.base_output_path === ""
            ? { base_output_path: d.base_output_path }
            : {}),
          ...(prev.target === "" && d.last_target
            ? { target: d.last_target }
            : {}),
        }));
      })
      .catch(() => {});
    if (csvLinhas.length === 0) {
      carregarCsvDoServidor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redockingUseCase]);

  // Sincroniza o histórico local com o job ativo atualizado pelo polling do contexto.
  // Exibe toast quando um job transita para "error".
  useEffect(() => {
    if (!activeJob) return;
    setJobs((prev) => prev.map((j) => (j.id === activeJob.id ? activeJob : j)));
    if (
      activeJob.status === "error" &&
      prevJobStatusRef.current !== "error"
    ) {
      showToast(
        activeJob.erro_msg
          ? `Falha no redocking: ${activeJob.erro_msg.split("\n")[0]}`
          : "Falha no redocking. Verifique o histórico para detalhes.",
        "error",
      );
    }
    prevJobStatusRef.current = activeJob.status;
  }, [activeJob, showToast]);

  const handleImportarCsv = useCallback(
    (file: File) => {
      // Tenta extrair o diretório do caminho completo do arquivo.
      // `file.path` é exposto em ambientes como Electron; em navegadores padrão retorna undefined.
      const fullPath: string | undefined = (file as unknown as { path?: string }).path;
      const dirFromFile = fullPath
        ? fullPath.replace(/[\\/][^\\/]+$/, "") // remove o nome do arquivo
        : undefined;

      if (dirFromFile) {
        setConfig((prev) => ({ ...prev, base_input_path: dirFromFile }));
        localStorage.setItem("redocking_base_input_path", dirFromFile);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        salvarCsvNoServidor(
          text,
          file.name,
          config.target,
          dirFromFile ?? config.base_input_path,
        );
      };
      reader.readAsText(file);
    },
    [salvarCsvNoServidor, config.target, config.base_input_path],
  );

  const handleConfigChange = useCallback((field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (field === "target") {
      localStorage.setItem("redocking_target", value);
      setProntidao(null); // invalida ao mudar o alvo
    } else if (field === "base_input_path") {
      localStorage.setItem("redocking_base_input_path", value);
      setProntidao(null); // invalida ao mudar a pasta
    }
  }, []);

  const handleVerificarProntidao = useCallback(async () => {
    const targetNorm = normalizarTarget(config.target);
    if (!targetNorm || !config.base_input_path || csvLinhas.length === 0) return;
    const token = localStorage.getItem("access_token") ?? "";
    try {
      const resultado = await redockingUseCase.verificarProntidao(
        targetNorm,
        config.base_input_path,
        token,
      );
      setProntidao(resultado);
    } catch {
      // ignora erros transientes
    }
  }, [config.target, config.base_input_path, csvLinhas.length, redockingUseCase]);

  const handlePreparar = useCallback(async () => {
    const targetNorm = normalizarTarget(config.target);
    if (!targetNorm || !config.base_input_path) return;
    const token = localStorage.getItem("access_token") ?? "";
    setPreparando(true);
    try {
      const resultado = await redockingUseCase.preparar(
        targetNorm,
        config.base_input_path,
        token,
      );
      setProntidao(resultado);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao preparar dados.",
        "error",
      );
    } finally {
      setPreparando(false);
    }
  }, [config.target, config.base_input_path, redockingUseCase, showToast]);

  const handleSubmit = useCallback(async () => {
    if (csvLinhas.length === 0) return;
    const targetNorm = normalizarTarget(config.target);
    if (!targetNorm || !config.base_input_path || !config.base_output_path)
      return;

    const token = localStorage.getItem("access_token") ?? "";
    setSubmitting(true);
    try {
      // Reconstrói o conteúdo CSV para enviar ao backend
      const header = "PDB_CODE,LIGAND,RESNUM,CHAIN,RESOLUTION";
      const linhas = csvLinhas.map(
        (l) =>
          `${l.pdb_code},${l.ligand},${l.resnum},${l.chain},${l.resolution}`,
      );
      const csv_content = [header, ...linhas].join("\n");

      const job = await redockingUseCase.iniciar(
        {
          target: targetNorm,
          base_input_path: config.base_input_path,
          base_output_path: config.base_output_path,
          charge_type: config.charge_type,
          csv_content,
        },
        token,
      );
      setActiveJob(job);
      setJobs((prev) => [job, ...prev]);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Erro ao iniciar o redocking.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }, [csvLinhas, config, redockingUseCase, setActiveJob]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const toggleMenu = useCallback(() => {
    setMenuAberto((v) => !v);
  }, []);

  const irParaBusca = useCallback(() => {
    setMenuAberto(false);
    navigate("/search");
  }, [navigate]);

  const irParaHistorico = useCallback(() => {
    setMenuAberto(false);
    navigate("/historico");
  }, [navigate]);

  const irParaMeusPdbs = useCallback(() => {
    setMenuAberto(false);
    navigate("/meus-pdbs");
  }, [navigate]);

  const irParaConfiguracoes = useCallback(() => {
    setMenuAberto(false);
    navigate("/configuracoes");
  }, [navigate]);

  const targetNormalizado = useMemo(
    () => normalizarTarget(config.target),
    [config.target],
  );
  const targetAjustado =
    config.target.trim() !== "" && targetNormalizado !== config.target.trim();

  const dashboard = useMemo((): RedockingDashboard | null => {
    if (csvLinhas.length === 0) return null;

    // Resolução média
    const resolucoes = csvLinhas
      .map((l) => parseFloat(l.resolution))
      .filter((v) => !isNaN(v));
    const resolucaoMedia =
      resolucoes.length > 0
        ? (resolucoes.reduce((a, b) => a + b, 0) / resolucoes.length).toFixed(
            2,
          ) + " Å"
        : "—";

    // Ligantes únicos
    const ligantesSet = new Set(csvLinhas.map((l) => l.ligand).filter(Boolean));
    // Cadeias únicas
    const cadeiaSet = new Set(csvLinhas.map((l) => l.chain).filter(Boolean));

    // Faixas de resolução (same bins as ResolutionBarChart)
    const faixas: Record<string, number> = {
      "< 1.5 Å": 0,
      "1.5–2.0 Å": 0,
      "2.0–2.5 Å": 0,
      "2.5–3.0 Å": 0,
      "> 3.0 Å": 0,
      "N/D": 0,
    };
    csvLinhas.forEach((l) => {
      const v = parseFloat(l.resolution);
      if (isNaN(v)) {
        faixas["N/D"]++;
      } else if (v < 1.5) {
        faixas["< 1.5 Å"]++;
      } else if (v < 2.0) {
        faixas["1.5–2.0 Å"]++;
      } else if (v < 2.5) {
        faixas["2.0–2.5 Å"]++;
      } else if (v < 3.0) {
        faixas["2.5–3.0 Å"]++;
      } else {
        faixas["> 3.0 Å"]++;
      }
    });
    const resolucaoFaixas = Object.entries(faixas)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0);

    // Top ligantes (top 8)
    const ligCount: Record<string, number> = {};
    csvLinhas.forEach((l) => {
      if (l.ligand) ligCount[l.ligand] = (ligCount[l.ligand] ?? 0) + 1;
    });
    const topLigantes = Object.entries(ligCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Por cadeia
    const chainCount: Record<string, number> = {};
    csvLinhas.forEach((l) => {
      if (l.chain) chainCount[l.chain] = (chainCount[l.chain] ?? 0) + 1;
    });
    const porCadeia = Object.entries(chainCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return {
      total: csvLinhas.length,
      ligantesUnicos: ligantesSet.size,
      resolucaoMedia,
      cadeiaUnicas: cadeiaSet.size,
      resolucaoFaixas,
      topLigantes,
      porCadeia,
    };
  }, [csvLinhas]);

  return {
    csvLinhas,
    csvFileName,
    dashboard,
    config,
    targetNormalizado,
    targetAjustado,
    prontidao,
    preparando,
    submitting,
    jobs,
    userEmail: user?.email ?? "",
    menuAberto,
    menuRef,
    toast,
    toastVariant,
    toggleMenu,
    irParaBusca,
    irParaHistorico,
    irParaMeusPdbs,
    irParaConfiguracoes,
    handleImportarCsv,
    handleConfigChange,
    handleVerificarProntidao,
    handlePreparar,
    handleSubmit,
    handleLogout,
  };
}
