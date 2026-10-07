// pages/ConsensusPage/useConsensusPage.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { ConsensusUseCase } from "../../data/usecases/consensus.usecase";
import type { AdmetUseCase } from "../../data/usecases/admet.usecase";
import type {
  ConsensusJobModel,
  ConsensusRedockingJobModel,
  ConsensusResultRowModel,
} from "../../domain/models/consensus.model";
import type { AdmetResultModel } from "../../domain/models/admet.model";

export type ConsensusPageMode = "setup" | "running" | "results" | "error" | "loading";

export interface UseConsensusPageReturn {
  mode: ConsensusPageMode;
  job: ConsensusJobModel | null;
  admetResult: AdmetResultModel | null;
  resultRows: ConsensusResultRowModel[];
  redockingJobs: ConsensusRedockingJobModel[];
  error: string | null;

  // Formulário
  selectedCategories: string[];
  onToggleCategory: (cat: string) => void;
  pdbId: string; onPdbId: (v: string) => void;
  ligandResname: string; onLigandResname: (v: string) => void;
  ligandResnum: string; onLigandResnum: (v: string) => void;
  chain: string; onChain: (v: string) => void;
  baseInputPath: string; onBaseInputPath: (v: string) => void;
  baseDockingOutputPath: string; onBaseDockingOutputPath: (v: string) => void;
  chargeType: string; onChargeType: (v: string) => void;
  prepareComplex: boolean; onPrepareComplex: (v: boolean) => void;
  maxMols: number | null; onMaxMols: (v: number | null) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;

  // Modal correlação
  showCorrelation: boolean;
  onOpenCorrelation: () => void;
  onCloseCorrelation: () => void;

  onDownload: () => void;
  onRerun: () => void;
  onGoCluster: () => void;
  handleLogout: () => void;
  voltarAdmet: () => void;
}

export function useConsensusPage(
  consensusUseCase: ConsensusUseCase,
  admetUseCase: AdmetUseCase,
): UseConsensusPageReturn {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = localStorage.getItem("access_token") ?? "";

  const [mode, setMode] = useState<ConsensusPageMode>("loading");
  const [job, setJob] = useState<ConsensusJobModel | null>(null);
  const [admetResult, setAdmetResult] = useState<AdmetResultModel | null>(null);
  const [resultRows, setResultRows] = useState<ConsensusResultRowModel[]>([]);
  const [redockingJobs, setRedockingJobs] = useState<ConsensusRedockingJobModel[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Formulário
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["bbb_plus"]);
  const [pdbId, setPdbId] = useState("");
  const [ligandResname, setLigandResname] = useState("");
  const [ligandResnum, setLigandResnum] = useState("");
  const [chain, setChain] = useState("");
  const [baseInputPath, setBaseInputPath] = useState("");
  const [baseDockingOutputPath, setBaseDockingOutputPath] = useState("/resultados/consenso");
  const [chargeType, setChargeType] = useState("am1");
  const [prepareComplex, setPrepareComplex] = useState(true);
  const [maxMols, setMaxMols] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [showCorrelation, setShowCorrelation] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const applyJob = useCallback((j: ConsensusJobModel) => {
    setJob(j);
    if (j.status === "done") {
      const rows: ConsensusResultRowModel[] = j.result_json ? JSON.parse(j.result_json) : [];
      setResultRows(rows);
      setMode("results");
    } else if (j.status === "error") {
      setError(j.error_msg ?? "Erro no docking de consenso.");
      setMode("error");
    } else {
      setMode("running");
    }
  }, []);

  const startPolling = useCallback((id: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const j = await consensusUseCase.getJob(id, token);
        if (!isMounted.current) return;
        applyJob(j);
        if (j.status === "done" || j.status === "error") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      } catch {
        // mantém polling
      }
    }, 4000);
  }, [consensusUseCase, token, applyJob]);

  // Inicialização
  useEffect(() => {
    const admetId = searchParams.get("admet_id");

    const init = async () => {
      // Carrega jobs de redocking para pré-preenchimento (sempre)
      try {
        const rjRes = await consensusUseCase.getRedockingJobs(token);
        if (isMounted.current) {
          setRedockingJobs(rjRes.jobs);
          // Pré-preenche paths se só tem um job
          if (rjRes.jobs.length === 1) {
            setBaseInputPath(rjRes.jobs[0].base_input_path);
            setChargeType(rjRes.jobs[0].charge_type);
          }
        }
      } catch {
        // silencia
      }

      if (jobId) {
        // Modo resultado: carrega job pelo ID
        try {
          const j = await consensusUseCase.getJob(Number(jobId), token);
          if (!isMounted.current) return;
          applyJob(j);
          if (j.status === "running" || j.status === "pending") startPolling(j.id);
        } catch (e) {
          if (!isMounted.current) return;
          setError(e instanceof Error ? e.message : "Job não encontrado.");
          setMode("error");
        }
        return;
      }

      if (admetId) {
        // Modo setup: carrega o ADMET result para mostrar os contadores
        try {
          const r = await admetUseCase.getResult(Number(admetId), token);
          if (!isMounted.current) return;
          setAdmetResult(r);
          // Verifica se já existe um job de consenso para este ADMET
          const existing = await consensusUseCase.getByAdmet(Number(admetId), token);
          if (existing && isMounted.current) {
            navigate(`/consensus/${existing.id}`, { replace: true });
            return;
          }
        } catch {
          // se deu 404 no getByAdmet, não há job — seguimos para o formulário
        }
        if (isMounted.current) setMode("setup");
        return;
      }

      if (isMounted.current) {
        setError("Parâmetros insuficientes.");
        setMode("error");
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const onToggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      if (cat === "all") return prev.includes("all") ? [] : ["all"];
      const without = prev.filter((c) => c !== "all");
      return without.includes(cat)
        ? without.filter((c) => c !== cat)
        : [...without, cat];
    });
  }, []);

  // ID do ADMET associado: vem do URL (?admet_id=) ou do job já carregado
  const admetIdForSubmit = useCallback((): number | null => {
    const fromUrl = searchParams.get("admet_id");
    if (fromUrl) return Number(fromUrl);
    if (job?.admet_result_id) return job.admet_result_id;
    return null;
  }, [searchParams, job]);

  const onSubmit = useCallback(async () => {
    const admetId = admetIdForSubmit();
    if (admetId === null) return;
    setSubmitting(true);
    setSubmitError(null);
    // Apaga clustering + neurodock downstream somente ao confirmar o novo run
    try {
      await fetch(`/api/clustering/by-admet/${admetId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {/* silencia */}
    try {
      const newJob = await consensusUseCase.iniciar(
        admetId,
        selectedCategories,
        pdbId.trim(),
        ligandResname.trim(),
        Number(ligandResnum),
        chain.trim(),
        baseInputPath.trim(),
        baseDockingOutputPath.trim(),
        chargeType,
        prepareComplex,
        token,
        maxMols,
      );
      if (!isMounted.current) return;
      navigate(`/consensus/${newJob.id}`, { replace: true });
      applyJob(newJob);
      if (newJob.status === "running" || newJob.status === "pending") startPolling(newJob.id);
    } catch (e) {
      if (!isMounted.current) return;
      setSubmitError(e instanceof Error ? e.message : "Erro ao iniciar o consenso.");
      setSubmitting(false);
    }
  }, [
    admetIdForSubmit, consensusUseCase, selectedCategories,
    pdbId, ligandResname, ligandResnum, chain,
    baseInputPath, baseDockingOutputPath, chargeType, prepareComplex, token, navigate, maxMols,
  ]);

  const onRerun = useCallback(async () => {
    if (!job || job.admet_result_id === null) return;
    // Para o polling imediatamente para não sobrescrever o estado de setup
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    // Não apaga clustering downstream aqui — preserva dados até o usuário confirmar com "Iniciar"
    setError(null);
    setResultRows([]);
    setMaxMols(null);   // reseta o limite para evitar submeter valor de run anterior
    // Pré-preenche o formulário com os dados do job atual e volta ao setup
    setPdbId(job.pdb_id);
    setLigandResname(job.ligand_resname);
    setLigandResnum(String(job.ligand_resnum));
    setChain(job.chain);
    setBaseInputPath(job.base_input_path);
    setBaseDockingOutputPath("/resultados/consenso");
    setChargeType(job.charge_type);
    setPrepareComplex(job.prepare_complex);
    // Carrega o admetResult se ainda não está disponível
    if (!admetResult) {
      try {
        const r = await admetUseCase.getResult(job.admet_result_id, token);
        if (isMounted.current) setAdmetResult(r);
      } catch {
        // mantém sem admetResult — formulário ainda funciona
      }
    }
    if (isMounted.current) setMode("setup");
  }, [job, admetResult, admetUseCase, token]);

  const onGoCluster = useCallback(() => {
    if (!job?.admet_result_id) return;
    navigate(`/clustering?admet_id=${job.admet_result_id}`);
  }, [job, navigate]);

  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);
  const voltarAdmet = useCallback(() => navigate(-1), [navigate]);

  return {
    mode,
    job,
    admetResult,
    resultRows,
    redockingJobs,
    error,
    selectedCategories, onToggleCategory,
    pdbId, onPdbId: setPdbId,
    ligandResname, onLigandResname: setLigandResname,
    ligandResnum, onLigandResnum: setLigandResnum,
    chain, onChain: setChain,
    baseInputPath, onBaseInputPath: setBaseInputPath,
    baseDockingOutputPath, onBaseDockingOutputPath: setBaseDockingOutputPath,
    chargeType, onChargeType: setChargeType,
    prepareComplex, onPrepareComplex: setPrepareComplex,
    maxMols, onMaxMols: setMaxMols,
    onSubmit, submitting, submitError,
    showCorrelation, onOpenCorrelation: () => setShowCorrelation(true), onCloseCorrelation: () => setShowCorrelation(false),
    onDownload: () => {
      if (!job) return;
      const token = localStorage.getItem("access_token") ?? "";
      fetch(`/api/consensus/${job.id}/download?t=${Date.now()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${job.target}_consenso.csv`;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => alert("Erro ao baixar o CSV. Tente novamente."));
    },
    onRerun,
    onGoCluster,
    handleLogout,
    voltarAdmet,
  };
}
