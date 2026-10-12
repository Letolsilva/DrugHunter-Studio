// pages/MolecularDynamicsPage/useMolecularDynamicsPage.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { HttpError } from "../../infra/http/httpClient";
import type { MolecularDynamicsUseCase } from "../../data/usecases/molecular_dynamics.usecase";
import type {
  MDJobModel,
  MDLiganteInfo,
  MDReceptorInfo,
  MDConsensusJobOption,
  MDParamsModel,
  IniciarMDPayload,
  MdAnalysisJobModel,
  MdAnalysisFilesModel,
} from "../../domain/models/molecular_dynamics.model";
import { DEFAULT_MD_PARAMS } from "../../domain/models/molecular_dynamics.model";

export type MDMode = "setup" | "running" | "done" | "error" | "cancelled" | "analysing" | "analysis_done" | "analysis_error" | "analysis_cancelled";
export type LigandSource = "consensus" | "upload";
export type ReceptorSource = "dh_prepared" | "upload" | "manual";

export interface UseMolecularDynamicsPageReturn {
  mode: MDMode;
  job: MDJobModel | null;
  jobs: MDJobModel[];
  jobsLoading: boolean;
  onDeleteJob: (id: number) => Promise<void>;
  historyPage: number;
  historyTotalPages: number;
  onHistoryPageChange: (page: number) => void;

  // Jobs de consenso disponíveis (para o dropdown)
  consensusJobs: MDConsensusJobOption[];

  // Ligante
  ligandSource: LigandSource;
  onLigandSource: (v: LigandSource) => void;
  consensusJobId: number | null;
  onConsensusJobId: (v: number | null) => void;

  availableLigantes: MDLiganteInfo[];
  ligandFilename: string;
  onLigandFilename: (v: string) => void;
  ligandUploadFile: File | null;
  onLigandUploadFile: (f: File | null) => void;
  ligandUploadPath: string;
  moleculeId: string;
  onMoleculeId: (v: string) => void;
  smiles: string;
  onSmiles: (v: string) => void;

  // Receptor
  receptorSource: ReceptorSource;
  onReceptorSource: (v: ReceptorSource) => void;
  availableReceptores: MDReceptorInfo[];
  receptorFilename: string;
  onReceptorFilename: (v: string) => void;
  receptorUploadFile: File | null;
  onReceptorUploadFile: (f: File | null) => void;
  receptorUploadPath: string;
  receptorManualPath: string;
  onReceptorManualPath: (v: string) => void;
  receptorManualFilename: string;
  onReceptorManualFilename: (v: string) => void;

  // Parâmetros MD
  params: MDParamsModel;
  onParam: <K extends keyof MDParamsModel>(key: K, value: MDParamsModel[K]) => void;

  // Ações
  onSubmit: () => Promise<void>;
  submitting: boolean;
  submitError: string;

  onCancelar: () => Promise<void>;
  onCancelarSimulacao: () => Promise<void>;
  onCancelarAnalise: () => Promise<void>;
  onNovaSimulacao: () => void;
  onTentarNovamente: () => void;

  // Resultado
  outputFiles: string[];
  onDownload: (filename: string) => Promise<void>;

  // Análise
  analysisJob: MdAnalysisJobModel | null;
  analysisFiles: MdAnalysisFilesModel;
  onIniciarAnalise: () => Promise<void>;
  analysisError: string;
  getAnaliseViewUrl: (subdir: "analysis" | "visualization", filename: string) => string;
  token: string;

  ligantesError: string;

  handleLogout: () => void;
}

export function useMolecularDynamicsPage(
  mdUseCase: MolecularDynamicsUseCase,
): UseMolecularDynamicsPageReturn {
  const navigate    = useNavigate();
  const { jobId }   = useParams<{ jobId?: string }>();
  const { logout } = useAuth();
  const token = localStorage.getItem("access_token") ?? "";

  const [mode, setMode]   = useState<MDMode>("setup");
  const [job, setJob]     = useState<MDJobModel | null>(null);
  const [jobs, setJobs]   = useState<MDJobModel[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 8;
  const historyTotalPages = Math.max(1, Math.ceil(jobs.length / HISTORY_PAGE_SIZE));
  const [consensusJobs, setConsensusJobs] = useState<MDConsensusJobOption[]>([]);

  // Ligante
  const [ligandSource, setLigandSource]         = useState<LigandSource>("consensus");
  const [consensusJobId, setConsensusJobId]      = useState<number | null>(null);
  const [availableLigantes, setAvailableLigantes] = useState<MDLiganteInfo[]>([]);
  const [ligandFilename, setLigandFilename]       = useState("");
  const [ligandUploadFile, setLigandUploadFile]   = useState<File | null>(null);
  const [ligandUploadPath, setLigandUploadPath]   = useState("");
  const [moleculeId, setMoleculeId]               = useState("");
  const [smiles, setSmiles]                       = useState("");

  // Receptor
  const [receptorSource, setReceptorSource]         = useState<ReceptorSource>("dh_prepared");
  const [availableReceptores, setAvailableReceptores] = useState<MDReceptorInfo[]>([]);
  const [receptorFilename, setReceptorFilename]       = useState("");
  const [receptorUploadFile, setReceptorUploadFile]   = useState<File | null>(null);
  const [receptorUploadPath, setReceptorUploadPath]   = useState("");
  const [receptorManualPath, setReceptorManualPath]   = useState("");
  const [receptorManualFilename, setReceptorManualFilename] = useState("");

  // Parâmetros
  const [params, setParams] = useState<MDParamsModel>({ ...DEFAULT_MD_PARAMS });

  // Submit
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [ligantesError, setLigantesError] = useState("");

  // Resultado
  const [outputFiles, setOutputFiles] = useState<string[]>([]);

  // Análise
  const [analysisJob, setAnalysisJob] = useState<MdAnalysisJobModel | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisFiles, setAnalysisFiles] = useState<MdAnalysisFilesModel>({ analysis: [], visualization: [] });
  const analysisPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  // Carrega lista de jobs de consenso concluídos na montagem
  useEffect(() => {
    if (!token) return;
    mdUseCase.listarJobsConsensus(token).then(setConsensusJobs).catch(() => {});
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reseta para setup e carrega histórico quando não há jobId na URL
  useEffect(() => {
    if (jobId) return;
    setMode("setup");
    setJob(null);
    setOutputFiles([]);
    if (!token) return;
    setJobsLoading(true);
    mdUseCase.listarJobs(token)
      .then((list) => { setJobs(list); setHistoryPage(1); })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [token, jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega job da URL
  useEffect(() => {
    if (!jobId || !token) return;
    const id = parseInt(jobId, 10);
    if (isNaN(id)) return;

    mdUseCase.getJob(id, token).then((j) => {
      setJob(j);
      if (j.status === "running" || j.status === "pending") {
        setMode("running");
      } else if (j.status === "done") {
        mdUseCase.listarArquivos(j.id, token).then(setOutputFiles).catch(() => {});
        // Verifica se já existe análise para este job
        mdUseCase.getAnalise(j.id, token).then((aj) => {
          if (!aj) { setMode("done"); return; }
          setAnalysisJob(aj);
          if (aj.status === "done") {
            setMode("analysis_done");
            mdUseCase.listarArquivosAnalise(j.id, token).then(setAnalysisFiles).catch(() => {});
          } else if (aj.status === "running" || aj.status === "pending") {
            setMode("analysing");
          } else if (aj.status === "error") {
            setAnalysisError(aj.error_msg ?? "Erro na análise.");
            setMode("analysis_error");
          } else if (aj.status === "cancelled") {
            setMode("analysis_cancelled");
          } else {
            setMode("done");
          }
        }).catch(() => { setMode("done"); });
      } else if (j.status === "error") {
        setMode("error");
      } else if (j.status === "cancelled") {
        setMode("cancelled");
      }
    }).catch(() => {});
  }, [jobId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (mode !== "running" || !job) return;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await mdUseCase.getJob(job.id, token);
        setJob(updated);
        if (updated.status === "done") {
          setMode("done");
          clearInterval(pollRef.current!);
          const files = await mdUseCase.listarArquivos(updated.id, token).catch(() => []);
          setOutputFiles(files);
        } else if (updated.status === "error") {
          setMode("error");
          clearInterval(pollRef.current!);
        } else if (updated.status === "cancelled") {
          setMode("cancelled");
          clearInterval(pollRef.current!);
        }
      } catch {
        // ignora erros de rede transitórios
      }
    }, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mode, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling de análise
  useEffect(() => {
    if (mode !== "analysing" || !analysisJob) return;
    analysisPollRef.current = setInterval(async () => {
      if (!job) return;
      try {
        const updated = await mdUseCase.getAnalise(job.id, token);
        if (!updated) return;
        setAnalysisJob(updated);
        if (updated.status === "done") {
          setMode("analysis_done");
          clearInterval(analysisPollRef.current!);
          if (job) mdUseCase.listarArquivosAnalise(job.id, token).then(setAnalysisFiles).catch(() => {});
        } else if (updated.status === "error") {
          setAnalysisError(updated.error_msg ?? "Erro na análise.");
          setMode("analysis_error");
          clearInterval(analysisPollRef.current!);
        } else if (updated.status === "cancelled") {
          setMode("analysis_cancelled");
          clearInterval(analysisPollRef.current!);
        }
      } catch { /* ignora erros transitórios */ }
    }, 10000);
    return () => { if (analysisPollRef.current) clearInterval(analysisPollRef.current); };
  }, [mode, analysisJob?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega lista de ligantes quando consensus job muda
  useEffect(() => {
    if (ligandSource !== "consensus" || !consensusJobId || !token) {
      if (ligandSource === "consensus") { setAvailableLigantes([]); setLigantesError(""); }
      return;
    }
    setLigantesError("");
    mdUseCase.listarLigantesConsensus(consensusJobId, token)
      .then((items) => { setAvailableLigantes(items); setLigantesError(""); })
      .catch((err: unknown) => {
        setAvailableLigantes([]);
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
        setLigantesError(detail ?? "Erro ao carregar ligantes desse job de consenso.");
      });
  }, [ligandSource, consensusJobId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega lista de receptores quando consensus job muda (usa DH datasets/PDB/{target}/Prepared/)
  useEffect(() => {
    if (!consensusJobId || receptorSource !== "dh_prepared" || !token) {
      setAvailableReceptores([]);
      return;
    }
    mdUseCase.listarReceptoresConsensus(consensusJobId, token).then(setAvailableReceptores).catch(() => {});
  }, [consensusJobId, receptorSource, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando um arquivo de ligante é selecionado para upload, envia imediatamente
  useEffect(() => {
    if (!ligandUploadFile || !token) return;
    mdUseCase.uploadLigante(ligandUploadFile, token)
      .then((r) => setLigandUploadPath(r.file_path))
      .catch(() => setLigandUploadPath(""));
  }, [ligandUploadFile, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Quando um arquivo de receptor é selecionado para upload, envia imediatamente
  useEffect(() => {
    if (!receptorUploadFile || !token) return;
    mdUseCase.uploadReceptor(receptorUploadFile, token)
      .then((r) => setReceptorUploadPath(r.file_path))
      .catch(() => setReceptorUploadPath(""));
  }, [receptorUploadFile, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onParam = useCallback(
    <K extends keyof MDParamsModel>(key: K, value: MDParamsModel[K]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const onSubmit = useCallback(async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      const payload: IniciarMDPayload = {
        molecule_id: moleculeId || "molécula",
        smiles: smiles || undefined,
        ligand_source: ligandSource,
        receptor_source: receptorSource,
        params,
      };

      if (ligandSource === "consensus") {
        payload.consensus_job_id = consensusJobId ?? undefined;
        payload.ligand_filename   = ligandFilename || undefined;
      } else {
        payload.ligand_file_path = ligandUploadPath || undefined;
      }

      if (receptorSource === "dh_prepared") {
        payload.receptor_source  = "dh_prepared";
        payload.consensus_job_id = payload.consensus_job_id ?? (consensusJobId ?? undefined);
        payload.receptor_filename = receptorFilename || undefined;
      } else if (receptorSource === "upload") {
        payload.receptor_source = "upload";
        payload.receptor_path   = receptorUploadPath || undefined;
      } else {
        payload.receptor_source   = "manual";
        payload.receptor_path     = receptorManualPath || undefined;
        payload.receptor_filename  = receptorManualFilename || undefined;
      }

      const newJob = await mdUseCase.iniciarMD(payload, token);
      setJob(newJob);
      setMode("running");
      navigate(`/dinamica-molecular/${newJob.id}`, { replace: true });
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Erro ao iniciar simulação.");
    } finally {
      setSubmitting(false);
    }
  }, [
    moleculeId, smiles, ligandSource, consensusJobId, ligandFilename,
    ligandUploadPath, receptorSource, receptorFilename, receptorUploadPath,
    receptorManualPath, receptorManualFilename, params, token, navigate,
    mdUseCase,
  ]);

  const onCancelar = useCallback(async () => {
    if (!job) return;
    try { await mdUseCase.deletarJob(job.id, token); } catch { /* ignora */ }
    navigate("/dinamica-molecular", { replace: true });
    setJob(null);
    setMode("setup");
  }, [job, token, navigate, mdUseCase]);

  // Cancela a simulação em andamento (o job permanece no histórico como "cancelado")
  const onCancelarSimulacao = useCallback(async () => {
    if (!job) return;
    try {
      await mdUseCase.cancelarSimulacao(job.id, token);
    } catch (e) {
      // 409: o job já terminou — apenas recarrega o estado abaixo
      if (!(e instanceof HttpError && e.status === 409)) {
        alert("Erro ao cancelar o processamento. Tente novamente.");
        return;
      }
    }
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      const updated = await mdUseCase.getJob(job.id, token);
      setJob(updated);
      if (updated.status === "done") {
        setMode("done");
        mdUseCase.listarArquivos(updated.id, token).then(setOutputFiles).catch(() => {});
      } else if (updated.status === "error") {
        setMode("error");
      } else {
        setMode("cancelled");
      }
    } catch {
      setMode("cancelled");
    }
  }, [job, token, mdUseCase]);

  // Cancela a análise de trajetória em andamento
  const onCancelarAnalise = useCallback(async () => {
    if (!job || !analysisJob) return;
    try {
      await mdUseCase.cancelarAnalise(analysisJob.id, token);
    } catch (e) {
      // 409: a análise já terminou — apenas recarrega o estado abaixo
      if (!(e instanceof HttpError && e.status === 409)) {
        alert("Erro ao cancelar o processamento. Tente novamente.");
        return;
      }
    }
    if (analysisPollRef.current) clearInterval(analysisPollRef.current);
    try {
      const updated = await mdUseCase.getAnalise(job.id, token);
      if (updated) setAnalysisJob(updated);
      if (updated?.status === "done") {
        setMode("analysis_done");
        mdUseCase.listarArquivosAnalise(job.id, token).then(setAnalysisFiles).catch(() => {});
      } else if (updated?.status === "error") {
        setAnalysisError(updated.error_msg ?? "Erro na análise.");
        setMode("analysis_error");
      } else {
        setMode("analysis_cancelled");
      }
    } catch {
      setMode("analysis_cancelled");
    }
  }, [job, analysisJob, token, mdUseCase]);

  const onNovaSimulacao = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    navigate("/dinamica-molecular", { replace: true });
    setJob(null);
    setMode("setup");
    setOutputFiles([]);
    setSubmitError("");
  }, [navigate]);

  const onTentarNovamente = useCallback(() => {
    setMode("setup");
    setSubmitError("");
  }, []);

  const getAnaliseViewUrl = useCallback(
    (subdir: "analysis" | "visualization", filename: string) => {
      if (!job) return "";
      return mdUseCase.getAnaliseViewUrl(job.id, subdir, filename);
    },
    [job, mdUseCase],
  );

  const onIniciarAnalise = useCallback(async () => {
    if (!job) return;
    setAnalysisError("");
    try {
      const aj = await mdUseCase.iniciarAnalise(job.id, token);
      setAnalysisJob(aj);
      setMode("analysing");
    } catch (e: unknown) {
      setAnalysisError(e instanceof Error ? e.message : "Erro ao iniciar análise.");
    }
  }, [job, token, mdUseCase]);

  const onDeleteJob = useCallback(async (id: number) => {
    try {
      await mdUseCase.deletarJob(id, token);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch { /* ignora */ }
  }, [token, mdUseCase]);

  const onDownload = useCallback(async (filename: string) => {
    if (!job) return;
    try {
      const url = mdUseCase.getDownloadUrl(job.id, filename);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* ignora */ }
  }, [job, token, mdUseCase]);

  return {
    mode, job, jobs,
    jobsLoading,
    onDeleteJob,
    historyPage,
    historyTotalPages,
    onHistoryPageChange: setHistoryPage,
    consensusJobs,
    ligandSource, onLigandSource: setLigandSource,
    consensusJobId, onConsensusJobId: setConsensusJobId,
    availableLigantes, ligandFilename, onLigandFilename: setLigandFilename,
    ligandUploadFile, onLigandUploadFile: setLigandUploadFile, ligandUploadPath,
    moleculeId, onMoleculeId: setMoleculeId,
    smiles, onSmiles: setSmiles,
    receptorSource, onReceptorSource: setReceptorSource,
    availableReceptores, receptorFilename, onReceptorFilename: setReceptorFilename,
    receptorUploadFile, onReceptorUploadFile: setReceptorUploadFile, receptorUploadPath,
    receptorManualPath, onReceptorManualPath: setReceptorManualPath,
    receptorManualFilename, onReceptorManualFilename: setReceptorManualFilename,
    params, onParam,
    onSubmit, submitting, submitError,
    onCancelar, onCancelarSimulacao, onCancelarAnalise, onNovaSimulacao, onTentarNovamente,
    outputFiles,
    onDownload,
    analysisJob,
    analysisFiles,
    onIniciarAnalise,
    analysisError,
    getAnaliseViewUrl,
    token,
    ligantesError,
    handleLogout,
  };
}
