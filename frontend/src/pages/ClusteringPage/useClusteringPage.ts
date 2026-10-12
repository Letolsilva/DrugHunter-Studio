// pages/ClusteringPage/useClusteringPage.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { ClusteringUseCase } from "../../data/usecases/clustering.usecase";
import type { ClusteringJobModel, ClusteringMoleculeRow, TsnePoint } from "../../domain/models/clustering.model";

export type ClusteringPageMode = "setup" | "running" | "results" | "error" | "cancelled" | "loading";

export interface UseClusteringPageReturn {
  mode: ClusteringPageMode;
  job: ClusteringJobModel | null;
  error: string | null;

  // Formulário
  fingerprintType: string;
  onFingerprintType: (v: string) => void;
  baseOutputPath: string;
  onBaseOutputPath: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitError: string | null;

  // Resultados
  molecules: ClusteringMoleculeRow[];
  filterCluster: number | null;
  onFilterCluster: (v: number | null) => void;
  showPlot: boolean;
  onOpenPlot: () => void;
  onClosePlot: () => void;

  // Dados t-SNE interativos
  tsnePoints: TsnePoint[] | null;

  // Imagem t-SNE estática (blob URL, fallback)
  plotBlobUrl: string | null;

  // Imagens de centroides (cluster_id → blob URL)
  centroidBlobUrls: Record<number, string>;

  onRerun: () => void;
  /** Cancela o clustering em andamento e atualiza o estado do job. */
  handleCancelar: () => Promise<void>;
  handleLogout: () => void;
  clusteringUseCase: ClusteringUseCase;
  token: string;
}

export function useClusteringPage(
  clusteringUseCase: ClusteringUseCase,
): UseClusteringPageReturn {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = localStorage.getItem("access_token") ?? "";

  const [mode, setMode] = useState<ClusteringPageMode>("loading");
  const [job, setJob] = useState<ClusteringJobModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [molecules, setMolecules] = useState<ClusteringMoleculeRow[]>([]);
  const [filterCluster, setFilterCluster] = useState<number | null>(null);
  const [showPlot, setShowPlot] = useState(false);
  const [tsnePoints, setTsnePoints] = useState<TsnePoint[] | null>(null);
  const [plotBlobUrl, setPlotBlobUrl] = useState<string | null>(null);
  const [centroidBlobUrls, setCentroidBlobUrls] = useState<Record<number, string>>({});

  // Formulário
  const [fingerprintType, setFingerprintType] = useState("morgan");
  const [baseOutputPath, setBaseOutputPath] = useState("/resultados/clustering");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadMolecules = useCallback((j: ClusteringJobModel) => {
    if (!j.result_csv_path) return;
    fetch(`/api/clustering/${j.id}/download?t=${Date.now()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.text())
      .then((text) => {
        const lines = text.trim().split("\n");
        if (lines.length < 2) return;
        const header = lines[0].split(",");
        const idIdx = header.findIndex((h) => h.toLowerCase().includes("molecule_chembl_id"));
        const smilesIdx = header.findIndex((h) => h.toLowerCase().includes("canonical_smiles"));
        const labelIdx = header.findIndex((h) => h.toLowerCase() === "label");
        if (idIdx < 0 || labelIdx < 0) return;
        const rows: ClusteringMoleculeRow[] = lines.slice(1).map((line) => {
          const cols = line.split(",");
          return {
            molecule_chembl_id: cols[idIdx]?.trim() ?? "",
            canonical_smiles: smilesIdx >= 0 ? cols[smilesIdx]?.trim() ?? "" : "",
            label: parseInt(cols[labelIdx]?.trim() ?? "0", 10),
          };
        }).filter((r) => r.molecule_chembl_id);
        if (isMounted.current) setMolecules(rows.sort((a, b) => a.label - b.label));
      })
      .catch(() => {/* silencia */});
  }, [token]);

  const loadTsneData = useCallback((j: ClusteringJobModel) => {
    fetch(`/api/clustering/${j.id}/tsne-data`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data && isMounted.current) setTsnePoints(data as TsnePoint[]);
      })
      .catch(() => {/* silencia — fallback para PNG */});
  }, [token]);

  const loadPlotBlob = useCallback((j: ClusteringJobModel) => {
    fetch(`/api/clustering/${j.id}/plot`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.ok ? res.blob() : null)
      .then((blob) => {
        if (blob && isMounted.current) {
          const url = URL.createObjectURL(blob);
          setPlotBlobUrl(url);
        }
      })
      .catch(() => {/* silencia */});
  }, [token]);

  const loadCentroidBlobs = useCallback((j: ClusteringJobModel) => {
    if (!j.n_clusters) return;
    const map: Record<number, string> = {};
    const promises = Array.from({ length: j.n_clusters }, (_, i) =>
      fetch(`/api/clustering/${j.id}/centroid/${i}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((res) => res.ok ? res.blob() : null)
        .then((blob) => {
          if (blob) map[i] = URL.createObjectURL(blob);
        })
        .catch(() => {/* silencia */})
    );
    Promise.all(promises).then(() => {
      if (isMounted.current) setCentroidBlobUrls(map);
    });
  }, [token]);

  const applyJob = useCallback((j: ClusteringJobModel) => {
    setJob(j);
    if (j.status === "done") {
      setMode("results");
      loadMolecules(j);
      loadTsneData(j);
      loadPlotBlob(j);
      loadCentroidBlobs(j);
    } else if (j.status === "error") {
      setError(j.error_msg ?? "Erro no clustering.");
      setMode("error");
    } else if (j.status === "cancelled") {
      setMode("cancelled");
    } else {
      setMode("running");
    }
  }, [loadMolecules, loadTsneData, loadPlotBlob, loadCentroidBlobs]);

  const startPolling = useCallback((id: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const j = await clusteringUseCase.getJob(id, token);
        if (!isMounted.current) return;
        applyJob(j);
        if (j.status === "done" || j.status === "error" || j.status === "cancelled") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      } catch {/* mantém polling */}
    }, 4000);
  }, [clusteringUseCase, token, applyJob]);

  useEffect(() => {
    const admetId = searchParams.get("admet_id");

    const init = async () => {
      if (jobId) {
        try {
          const j = await clusteringUseCase.getJob(Number(jobId), token);
          if (!isMounted.current) return;
          applyJob(j);
          if (j.status === "running") startPolling(j.id);
        } catch (e) {
          if (!isMounted.current) return;
          setError(e instanceof Error ? e.message : "Job não encontrado.");
          setMode("error");
        }
        return;
      }

      if (admetId) {
        const forceSetup = searchParams.get("rerun") === "1";
        if (!forceSetup) {
          try {
            const existing = await clusteringUseCase.getByAdmet(Number(admetId), token);
            if (existing && isMounted.current) {
              // Redireciona para o job mais recente independente do status —
              // a página do job exibe corretamente running/done/error.
              navigate(`/clustering/${existing.id}`, { replace: true });
              return;
            }
          } catch {/* sem job ainda */}
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

  const admetIdForSubmit = (): number | null => {
    const fromUrl = searchParams.get("admet_id");
    if (fromUrl) return Number(fromUrl);
    if (job?.admet_result_id) return job.admet_result_id;
    return null;
  };

  const onSubmit = useCallback(async () => {
    const admetId = admetIdForSubmit();
    if (admetId === null) return;
    setSubmitting(true);
    setSubmitError(null);
    // Apaga o job anterior (e NeuroDock em cascade) somente ao confirmar o novo run
    if (job?.id) {
      try {
        await fetch(`/api/clustering/${job.id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch {/* silencia */}
    }
    try {
      const newJob = await clusteringUseCase.iniciar(
        admetId,
        fingerprintType,
        baseOutputPath.trim(),
        token,
        null,
      );
      if (!isMounted.current) return;
      navigate(`/clustering/${newJob.id}`, { replace: true });
      applyJob(newJob);
      if (newJob.status === "running") startPolling(newJob.id);
    } catch (e) {
      if (!isMounted.current) return;
      setSubmitError(e instanceof Error ? e.message : "Erro ao iniciar o clustering.");
      setSubmitting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusteringUseCase, fingerprintType, baseOutputPath, token, navigate, job]);

  const onRerun = useCallback(() => {
    if (!job) return;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    // Não apaga do banco — preserva os dados até o usuário confirmar com "Iniciar"
    setError(null);
    setMolecules([]);
    setTsnePoints(null);
    setPlotBlobUrl(null);
    setCentroidBlobUrls({});
    setMode("setup");
  }, [job]);

  const handleCancelar = useCallback(async () => {
    if (!job) return;
    try {
      await clusteringUseCase.cancelar(job.id, token);
      const j = await clusteringUseCase.getJob(job.id, token);
      if (!isMounted.current) return;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      applyJob(j);
    } catch (e) {
      if (!isMounted.current) return;
      setError(e instanceof Error ? e.message : "Erro ao cancelar.");
      setMode("error");
    }
  }, [job, clusteringUseCase, token, applyJob]);

  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);


  return {
    mode,
    job,
    error,
    fingerprintType,
    onFingerprintType: setFingerprintType,
    baseOutputPath,
    onBaseOutputPath: setBaseOutputPath,
    onSubmit,
    submitting,
    submitError,
    molecules,
    filterCluster,
    onFilterCluster: setFilterCluster,
    showPlot,
    onOpenPlot: () => setShowPlot(true),
    onClosePlot: () => setShowPlot(false),
    tsnePoints,
    plotBlobUrl,
    centroidBlobUrls,
    onRerun,
    handleCancelar,
    handleLogout,
    clusteringUseCase,
    token,
  };
}
