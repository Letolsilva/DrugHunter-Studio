// pages/NeuroDockPage/useNeuroDockPage.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { HttpError } from "../../infra/http/httpClient";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { NeuroDockUseCase } from "../../data/usecases/neurodock.usecase";
import type {
  NeuroDockModelModel,
  NeuroDockPredictionModel,
  NeuroDockTopMolecule,
} from "../../domain/models/neurodock.model";

export type NeuroDockPageMode =
  | "loading"
  | "setup_train"
  | "training"
  | "train_done"
  | "predicting"
  | "results"
  | "error";

export interface UseNeuroDockPageReturn {
  mode: NeuroDockPageMode;
  model: NeuroDockModelModel | null;
  prediction: NeuroDockPredictionModel | null;
  error: string | null;
  errorSource: "training" | "prediction" | null;

  // Formulário de treinamento
  evaluationName: string;
  onEvaluationName: (v: string) => void;
  consensusType: string;
  onConsensusType: (v: string) => void;
  nTrials: number;
  onNTrials: (v: number) => void;
  modelOutputPath: string;
  onModelOutputPath: (v: string) => void;
  historyOutputPath: string;
  onHistoryOutputPath: (v: string) => void;
  onSubmitTrain: () => void;
  submittingTrain: boolean;
  submitTrainError: string | null;

  // Formulário de triagem
  libraryCsvPath: string;
  onLibraryCsvPath: (v: string) => void;
  inputDataset: string;
  onInputDataset: (v: string) => void;
  topK: string;
  onTopK: (v: string) => void;
  batchSize: string;
  onBatchSize: (v: string) => void;
  predictOutputPath: string;
  onPredictOutputPath: (v: string) => void;
  onSubmitPredict: () => void;
  submittingPredict: boolean;
  submitPredictError: string | null;

  // Histórico de treino
  plotCount: number;
  plotBlobUrls: string[];
  modelConfig: Record<string, unknown> | null;

  // Resultados de triagem
  topMolecules: NeuroDockTopMolecule[];
  topColumns: string[];

  // Ações
  onRetrainFromError: () => void;
  onRetryPredict: () => void;
  onNewPrediction: () => void;
  onRetrainNew: () => void;
  onDownloadTop: () => void;
  handleLogout: () => void;
  neuroDockUseCase: NeuroDockUseCase;
  token: string;
}

export function useNeuroDockPage(
  neuroDockUseCase: NeuroDockUseCase,
): UseNeuroDockPageReturn {
  const { modelId, predId } = useParams<{ modelId: string; predId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = localStorage.getItem("access_token") ?? "";

  const [mode, setMode] = useState<NeuroDockPageMode>("loading");
  const [model, setModel] = useState<NeuroDockModelModel | null>(null);
  const [prediction, setPrediction] = useState<NeuroDockPredictionModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorSource, setErrorSource] = useState<"training" | "prediction" | null>(null);

  // Formulário de treinamento
  const [evaluationName, setEvaluationName] = useState("MorganBestModel");
  const [consensusType, setConsensusType] = useState("min-max");
  const [nTrials, setNTrials] = useState(20);
  const [modelOutputPath, setModelOutputPath] = useState("/resultados/neurodock/model");
  const [historyOutputPath, setHistoryOutputPath] = useState("/resultados/neurodock/plots");
  const [submittingTrain, setSubmittingTrain] = useState(false);
  const [submitTrainError, setSubmitTrainError] = useState<string | null>(null);

  // Formulário de triagem
  const [libraryCsvPath, setLibraryCsvPath] = useState("");
  const [inputDataset, setInputDataset] = useState("Library");
  const [topK, setTopK] = useState("50");
  const [batchSize, setBatchSize] = useState("10000");
  const [predictOutputPath, setPredictOutputPath] = useState("/resultados/neurodock/predictions");
  const [submittingPredict, setSubmittingPredict] = useState(false);
  const [submitPredictError, setSubmitPredictError] = useState<string | null>(null);

  // Imagens de histórico
  const [plotCount, setPlotCount] = useState(0);
  const [plotBlobUrls, setPlotBlobUrls] = useState<string[]>([]);

  // Configuração do modelo (hiperparâmetros Optuna)
  const [modelConfig, setModelConfig] = useState<Record<string, unknown> | null>(null);

  // Resultados de triagem
  const [topMolecules, setTopMolecules] = useState<NeuroDockTopMolecule[]>([]);
  const [topColumns, setTopColumns] = useState<string[]>([]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadPlotBlobs = useCallback(async (m: NeuroDockModelModel) => {
    try {
      const [info] = await Promise.all([
        neuroDockUseCase.getPlotsCount(m.id, token),
        neuroDockUseCase.getModelConfig(m.id, token)
          .then((cfg) => { if (isMounted.current) setModelConfig(cfg); })
          .catch(() => {/* silencia — JSON opcional */}),
      ]);
      if (!isMounted.current) return;
      setPlotCount(info.count);
      if (info.count === 0) return;

      const urls: string[] = [];
      for (let i = 0; i < info.count; i++) {
        const res = await fetch(`/api/neurodock/model/${m.id}/plot?index=${i}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const blob = await res.blob();
          urls.push(URL.createObjectURL(blob));
        }
      }
      if (isMounted.current) setPlotBlobUrls(urls);
    } catch {/* silencia */}
  }, [neuroDockUseCase, token]);

  const loadTopMolecules = useCallback((pred: NeuroDockPredictionModel) => {
    fetch(`/api/neurodock/prediction/${pred.id}/download/top?t=${Date.now()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.text())
      .then((text) => {
        const lines = text.trim().split("\n");
        if (lines.length < 2) return;
        const header = lines[0].split(",").map((h) => h.trim());
        const rows: NeuroDockTopMolecule[] = lines.slice(1).map((line) => {
          const cols = line.split(",");
          const row: Record<string, string | number> = {};
          header.forEach((h, i) => {
            const raw = (cols[i] ?? "").trim().replace(/^\[|\]$/g, ""); // remove colchetes do DrugHunter
            row[h] = isNaN(Number(raw)) || raw === "" ? raw : Number(raw);
          });
          const idKey = header.find((h) => h.includes("zinc_id") || h.includes("molecule_chembl_id")) ?? header[0];
          const smilesKey = header.find((h) => h.includes("smile") || h.includes("smiles")) ?? "";
          return {
            id: String(row[idKey] ?? ""),
            smiles: String(row[smilesKey] ?? ""),
            product_score: Number(row["product_score"] ?? 0),
            ...row,
          } as NeuroDockTopMolecule;
        }).filter((r) => r.id);
        if (isMounted.current) {
          setTopMolecules(rows);
          setTopColumns(header);
        }
      })
      .catch(() => {/* silencia */});
  }, [token]);

  const applyModel = useCallback((m: NeuroDockModelModel) => {
    setModel(m);
    if (m.status === "done") {
      setMode("train_done");
      loadPlotBlobs(m);
    } else if (m.status === "error") {
      setError(m.error_msg ?? "Erro no treinamento.");
      setErrorSource("training");
      setMode("error");
    } else {
      setMode("training");
    }
  }, [loadPlotBlobs]);

  const applyPrediction = useCallback((pred: NeuroDockPredictionModel) => {
    setPrediction(pred);
    if (pred.status === "done") {
      setMode("results");
      loadTopMolecules(pred);
    } else if (pred.status === "error") {
      setError(pred.error_msg ?? "Erro na triagem.");
      setErrorSource("prediction");
      setMode("error");
    } else {
      setMode("predicting");
    }
  }, [loadTopMolecules]);

  const startModelPolling = useCallback((id: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const m = await neuroDockUseCase.getModel(id, token);
        if (!isMounted.current) return;
        applyModel(m);
        if (m.status === "done" || m.status === "error") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          // Modelo foi deletado — para o polling e volta ao formulário
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          if (isMounted.current) {
            setError("O modelo foi removido. Inicie um novo treinamento.");
            setMode("error");
          }
        }
        /* outros erros de rede: mantém polling */
      }
    }, 8000);
  }, [neuroDockUseCase, token, applyModel]);

  const startPredictionPolling = useCallback((id: number) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const pred = await neuroDockUseCase.getPrediction(id, token);
        if (!isMounted.current) return;
        applyPrediction(pred);
        if (pred.status === "done" || pred.status === "error") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
        }
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          if (isMounted.current) {
            setError("A triagem foi removida.");
            setMode("error");
          }
        }
        /* outros erros de rede: mantém polling */
      }
    }, 5000);
  }, [neuroDockUseCase, token, applyPrediction]);

  useEffect(() => {
    const clusteringId = searchParams.get("clustering_id");

    const init = async () => {
      // /neurodock/:modelId/prediction/:predId
      if (modelId && predId) {
        try {
          const [m, pred] = await Promise.all([
            neuroDockUseCase.getModel(Number(modelId), token),
            neuroDockUseCase.getPrediction(Number(predId), token),
          ]);
          if (!isMounted.current) return;
          setModel(m);
          if (m.status === "done") loadPlotBlobs(m);
          applyPrediction(pred);
          if (pred.status === "running") startPredictionPolling(pred.id);
        } catch (e) {
          if (!isMounted.current) return;
          setError(e instanceof Error ? e.message : "Não encontrado.");
          setMode("error");
        }
        return;
      }

      // /neurodock/:modelId  (sem predId — verifica se já existe triagem concluída)
      if (modelId) {
        try {
          const m = await neuroDockUseCase.getModel(Number(modelId), token);
          if (!isMounted.current) return;

          if (m.status === "done") {
            // Verifica se já existe triagem para este modelo
            try {
              const latestPred = await neuroDockUseCase.getLatestPrediction(m.id, token);
              if (!isMounted.current) return;
              // Navega para a URL completa com predId para persistir o estado
              navigate(`/neurodock/${m.id}/prediction/${latestPred.id}`, { replace: true });
              setModel(m);
              applyPrediction(latestPred);
              if (latestPred.status === "running") startPredictionPolling(latestPred.id);
            } catch {
              // Nenhuma triagem ainda — mostra formulário de triagem
              applyModel(m);
            }
          } else {
            applyModel(m);
            if (m.status === "running") startModelPolling(m.id);
          }
        } catch (e) {
          if (!isMounted.current) return;
          setError(e instanceof Error ? e.message : "Modelo não encontrado.");
          setMode("error");
        }
        return;
      }

      // /neurodock?clustering_id=<id>[&rerun=1]
      if (clusteringId) {
        const rerun = searchParams.get("rerun") === "1";
        if (rerun) {
          // Usuário quer treinar novo modelo — mostra formulário sem redirecionar
          if (isMounted.current) setMode("setup_train");
          return;
        }
        try {
          const existing = await neuroDockUseCase.getModelByClustering(Number(clusteringId), token);
          if (!isMounted.current) return;
          if (existing.status !== "error") {
            navigate(`/neurodock/${existing.id}`, { replace: true });
            return;
          }
          // Em erro: mostra formulário com clustering_id preservado
          applyModel(existing);
        } catch {
          // Sem modelo ainda — mostra formulário
          if (isMounted.current) setMode("setup_train");
        }
        return;
      }

      if (isMounted.current) {
        setError("Parâmetros insuficientes. Acesse esta página a partir da página de Clustering.");
        setMode("error");
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, predId]);

  const onSubmitTrain = useCallback(async () => {
    const clusteringId = searchParams.get("clustering_id");
    if (!clusteringId) return;
    setSubmittingTrain(true);
    setSubmitTrainError(null);
    try {
      const m = await neuroDockUseCase.treinar(
        Number(clusteringId),
        evaluationName.trim() || "MorganBestModel",
        consensusType,
        modelOutputPath.trim(),
        historyOutputPath.trim(),
        token,
        nTrials,
      );
      if (!isMounted.current) return;
      navigate(`/neurodock/${m.id}`, { replace: true });
      applyModel(m);
      if (m.status === "running") startModelPolling(m.id);
    } catch (e) {
      if (!isMounted.current) return;
      setSubmitTrainError(e instanceof Error ? e.message : "Erro ao iniciar treinamento.");
      setSubmittingTrain(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neuroDockUseCase, evaluationName, consensusType, nTrials, modelOutputPath, historyOutputPath, token, navigate]);

  const onSubmitPredict = useCallback(async () => {
    if (!model) return;
    setSubmittingPredict(true);
    setSubmitPredictError(null);
    try {
      const pred = await neuroDockUseCase.iniciarTriagem(
        model.id,
        libraryCsvPath.trim(),
        inputDataset.trim() || "Library",
        parseInt(topK, 10) || 50,
        parseInt(batchSize, 10) || 10000,
        predictOutputPath.trim(),
        token,
      );
      if (!isMounted.current) return;
      navigate(`/neurodock/${model.id}/prediction/${pred.id}`, { replace: true });
      applyPrediction(pred);
      if (pred.status === "running") startPredictionPolling(pred.id);
    } catch (e) {
      if (!isMounted.current) return;
      setSubmitPredictError(e instanceof Error ? e.message : "Erro ao iniciar triagem.");
      setSubmittingPredict(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neuroDockUseCase, model, libraryCsvPath, inputDataset, topK, batchSize, predictOutputPath, token, navigate]);

  const onNewPrediction = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setMode("train_done");
  }, []);

  const onRetryPredict = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setError(null);
    setErrorSource(null);
    setPrediction(null);
    setTopMolecules([]);
    // Volta ao formulário de triagem mantendo o modelo treinado
    setMode("train_done");
  }, []);

  const onRetrainFromError = useCallback(() => {
    const clusteringId = model?.clustering_job_id
      ?? searchParams.get("clustering_id");
    if (!clusteringId) return;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setError(null);
    setErrorSource(null);
    setModel(null);
    setPrediction(null);
    // rerun=1 evita que o init chame getModelByClustering e recarregue o estado de erro
    navigate(`/neurodock?clustering_id=${clusteringId}&rerun=1`, { replace: true });
    // Define o modo diretamente: quando vindo de ?clustering_id= (sem modelId na URL),
    // modelId/predId permanecem undefined e o useEffect não re-dispara.
    setMode("setup_train");
  }, [model, searchParams, navigate]);

  const onRetrainNew = useCallback(() => {
    const clusteringId = model?.clustering_job_id;
    if (!clusteringId) return;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setError(null);
    setModel(null);
    setPrediction(null);
    setPlotBlobUrls([]);
    setTopMolecules([]);
    navigate(`/neurodock?clustering_id=${clusteringId}&rerun=1`, { replace: true });
  }, [model, navigate]);

  const onDownloadTop = useCallback(() => {
    if (!prediction) return;
    fetch(`/api/neurodock/prediction/${prediction.id}/download/top?t=${Date.now()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${prediction.input_dataset}_top${prediction.top_k}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert("Erro ao baixar. Tente novamente."));
  }, [prediction, token]);



  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);

  return {
    mode,
    model,
    prediction,
    error,
    errorSource,
    evaluationName,
    onEvaluationName: setEvaluationName,
    consensusType,
    onConsensusType: setConsensusType,
    nTrials,
    onNTrials: setNTrials,
    modelOutputPath,
    onModelOutputPath: setModelOutputPath,
    historyOutputPath,
    onHistoryOutputPath: setHistoryOutputPath,
    onSubmitTrain,
    submittingTrain,
    submitTrainError,
    libraryCsvPath,
    onLibraryCsvPath: setLibraryCsvPath,
    inputDataset,
    onInputDataset: setInputDataset,
    topK,
    onTopK: setTopK,
    batchSize,
    onBatchSize: setBatchSize,
    predictOutputPath,
    onPredictOutputPath: setPredictOutputPath,
    onSubmitPredict,
    submittingPredict,
    submitPredictError,
    plotCount,
    plotBlobUrls,
    modelConfig,
    topMolecules,
    topColumns,
    onRetrainFromError,
    onRetryPredict,
    onNewPrediction,
    onRetrainNew,
    onDownloadTop,
    handleLogout,
    neuroDockUseCase,
    token,
  };
}
