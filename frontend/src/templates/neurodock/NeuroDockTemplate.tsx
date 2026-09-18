// templates/neurodock/NeuroDockTemplate.tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SmilesDrawer from "smiles-drawer";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import {
  ArrowLeftIcon,
  CloseIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "../../components/icons";
import type { UseNeuroDockPageReturn } from "../../pages/NeuroDockPage/useNeuroDockPage";
import type { NeuroDockModelModel, NeuroDockPredictionModel, NeuroDockTopMolecule } from "../../domain/models/neurodock.model";

type NeuroDockTemplateProps = UseNeuroDockPageReturn;

export default function NeuroDockTemplate(props: NeuroDockTemplateProps) {
  const {
    mode,
    model,
    prediction,
    error,
    evaluationName, onEvaluationName,
    consensusType, onConsensusType,
    nTrials, onNTrials,
    modelOutputPath, onModelOutputPath,
    historyOutputPath, onHistoryOutputPath,
    onSubmitTrain, submittingTrain, submitTrainError,
    libraryCsvPath, onLibraryCsvPath,
    inputDataset, onInputDataset,
    topK, onTopK,
    batchSize, onBatchSize,
    predictOutputPath, onPredictOutputPath,
    onSubmitPredict, submittingPredict, submitPredictError,
    plotBlobUrls,
    modelConfig,
    topMolecules, topColumns,
    errorSource,
    onRetrainFromError, onRetryPredict, onNewPrediction, onRetrainNew, onDownloadTop,
    handleLogout,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isDirectAccessError =
    mode === "error" &&
    (error?.includes("Parâmetros insuficientes") || error?.includes("clustering"));

  return (
    <div className="min-h-screen bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[12px] text-foreground-subtle hover:bg-surface-secondary transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeftIcon size={14} />
            Voltar
          </button>
        </Navbar.Left>
        <Navbar.Middle>
          <MiddleBar activeModule="chembl" />
        </Navbar.Middle>
        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            trigger={<MenuIcon size={18} />}
          >
            <DropdownMenu.Item icon={<SettingsIcon size={14} />} label="Configurações" onClick={() => navigate("/configuracoes")} />
            <DropdownMenu.Item icon={<HelpIcon size={14} />} label="Ajuda" onClick={() => navigate("/ajuda")} divider />
            <DropdownMenu.Item icon={<LogoutIcon size={14} />} label="Sair" onClick={handleLogout} />
          </DropdownMenu>
        </Navbar.Right>
      </Navbar>

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-6">
        {/* Link para voltar ao clustering de origem */}
        {model?.clustering_job_id != null && (
          <div className="mb-4">
            <button
              className="flex items-center gap-1.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors"
              onClick={() => navigate(`/clustering/${model.clustering_job_id}`)}
            >
              <ArrowLeftIcon size={12} />
              Ver clustering de origem
            </button>
          </div>
        )}
        <div className="mb-6">
          <h1 className="font-mono text-[18px] font-bold text-foreground">NeuroDock — Predição Neural</h1>
          <p className="font-mono text-[12px] text-foreground-subtle mt-0.5">
            Treinamento de rede neural · Triagem virtual de biblioteca molecular
          </p>
        </div>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {mode === "loading" && (
          <div className="flex justify-center py-20">
            <Spinner style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
        )}

        {/* ── Setup Treinamento ─────────────────────────────────────────────── */}
        {mode === "setup_train" && (
          <TrainForm
            evaluationName={evaluationName} onEvaluationName={onEvaluationName}
            consensusType={consensusType} onConsensusType={onConsensusType}
            nTrials={nTrials} onNTrials={onNTrials}
            modelOutputPath={modelOutputPath} onModelOutputPath={onModelOutputPath}
            historyOutputPath={historyOutputPath} onHistoryOutputPath={onHistoryOutputPath}
            onSubmit={onSubmitTrain} submitting={submittingTrain} submitError={submitTrainError}
          />
        )}

        {/* ── Treinando ────────────────────────────────────────────────────── */}
        {mode === "training" && (
          <RunningCard
            title="Treinando Modelo Neural"
            description={
              (model?.target || model?.evaluation_name)
                ? `Otimizando hiperparâmetros para o alvo "${model?.target ?? "detectado"}" com modelo "${model?.evaluation_name ?? evaluationName}"...`
                : `Treinando modelo "${evaluationName}"...`
            }
            hint={`O processo usa Optuna com ${nTrials} trials. Pode levar de 30 minutos a algumas horas. Você pode fechar esta página — o processamento continua no servidor.`}
            onBack={() => navigate(-1)}
          />
        )}

        {/* ── Treino Concluído + Setup Triagem ─────────────────────────────── */}
        {mode === "train_done" && model && (
          <div className="flex flex-col gap-8">
            <TrainResultCard model={model} plotBlobUrls={plotBlobUrls} modelConfig={modelConfig} onRetrainNew={model.clustering_job_id != null ? onRetrainNew : undefined} />
            <PredictForm
              libraryCsvPath={libraryCsvPath} onLibraryCsvPath={onLibraryCsvPath}
              inputDataset={inputDataset} onInputDataset={onInputDataset}
              topK={topK} onTopK={onTopK}
              batchSize={batchSize} onBatchSize={onBatchSize}
              predictOutputPath={predictOutputPath} onPredictOutputPath={onPredictOutputPath}
              onSubmit={onSubmitPredict} submitting={submittingPredict} submitError={submitPredictError}
            />
          </div>
        )}

        {/* ── Triagem em andamento ──────────────────────────────────────────── */}
        {mode === "predicting" && (
          <RunningCard
            title="Triagem Virtual em Andamento"
            description={
              prediction
                ? `Triando a biblioteca "${prediction.input_dataset ?? inputDataset}" com o modelo "${model?.evaluation_name ?? evaluationName}"...`
                : "Triagem em andamento..."
            }
            hint={`Processando em batches de ${prediction?.batch_size ?? batchSize} moléculas. Você pode fechar esta página — o processamento continua no servidor.`}
            onBack={() => navigate(-1)}
          />
        )}

        {/* ── Resultados ───────────────────────────────────────────────────── */}
        {mode === "results" && model && prediction && (
          <ResultsView
            model={model}
            prediction={prediction}
            topMolecules={topMolecules}
            topColumns={topColumns}
            onDownloadTop={onDownloadTop}
            onNewPrediction={onNewPrediction}
            onRetrainNew={onRetrainNew}
            plotBlobUrls={plotBlobUrls}
            modelConfig={modelConfig}
          />
        )}

        {/* ── Erro: acesso direto sem clustering ───────────────────────────── */}
        {mode === "error" && isDirectAccessError && (
          <div className="max-w-xl mx-auto mt-12 flex flex-col gap-4">
            <div className="rounded-xl border border-outline bg-panel px-6 py-6">
              <p className="font-mono text-[13px] font-semibold text-foreground mb-1">
                Como acessar o NeuroDock
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle leading-relaxed">
                O NeuroDock precisa de um resultado de <strong>Clustering</strong> para funcionar —
                ele usa as moléculas e fingerprints gerados naquela etapa.
              </p>
              <p className="font-mono text-[12px] text-foreground-subtle mt-3 leading-relaxed">
                Para iniciar: acesse a aba <strong>Bioatividade</strong>, execute o Clustering
                e clique no botão <strong>NeuroDock →</strong> nos resultados.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/chembl")}
                className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
                style={{ borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" }}
              >
                Ir para Bioatividade →
              </button>
              <button
                onClick={() => navigate(-1)}
                className="font-mono text-[12px] rounded-xl border px-4 py-3 transition-colors hover:bg-surface-secondary"
                style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
              >
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* ── Erro: falha no treinamento / triagem ─────────────────────────── */}
        {mode === "error" && !isDirectAccessError && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] font-semibold text-red-400 mb-1">
                {errorSource === "prediction" ? "Erro na triagem" : "Erro no treinamento"}
              </p>
              <p className="font-mono text-[12px] text-red-400/80">{error}</p>
            </div>
            <button
              onClick={errorSource === "prediction" ? onRetryPredict : onRetrainFromError}
              className="cursor-pointer shrink-0 font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              {errorSource === "prediction" ? "Tentar triagem novamente" : "Tentar novamente"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── TrainForm ─────────────────────────────────────────────────────────────────

interface TrainFormProps {
  evaluationName: string; onEvaluationName: (v: string) => void;
  consensusType: string; onConsensusType: (v: string) => void;
  nTrials: number; onNTrials: (v: number) => void;
  modelOutputPath: string; onModelOutputPath: (v: string) => void;
  historyOutputPath: string; onHistoryOutputPath: (v: string) => void;
  onSubmit: () => void; submitting: boolean; submitError: string | null;
}

function TrainForm({
  evaluationName, onEvaluationName,
  consensusType, onConsensusType,
  nTrials, onNTrials,
  modelOutputPath, onModelOutputPath,
  historyOutputPath, onHistoryOutputPath,
  onSubmit, submitting, submitError,
}: TrainFormProps) {
  const inputBase = "w-full rounded-lg border font-mono text-[12px] px-3 py-2 bg-surface-secondary text-foreground focus:outline-none focus:ring-1 transition-colors";
  const inputStyle = { borderColor: "var(--color-outline)" };

  const trialsHint =
    nTrials <= 20  ? "Rápido — ≤8 GiB RAM" :
    nTrials <= 50  ? "Moderado — 16 GiB RAM" :
    nTrials <= 100 ? "Completo — 32+ GiB RAM" :
                    "Extenso — pode demorar horas";

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      {/* Info box */}
      <div className="rounded-xl border px-4 py-4 font-mono text-[12px] text-foreground-subtle leading-relaxed"
        style={{ borderColor: "var(--color-accent-25)", background: "var(--color-accent-12)" }}>
        <p className="font-semibold text-foreground mb-1">Fase 1 — Treinamento do Modelo Neural</p>
        Os fingerprints e scores de consenso do Clustering e Docking são carregados automaticamente.
        O Optuna realizará <strong>{nTrials} trials</strong> para encontrar os melhores hiperparâmetros —
        o processo pode levar <strong>30 minutos a algumas horas</strong> dependendo do dataset e do hardware.
        Você pode fechar a página durante o treino.
      </div>

      {/* Formulário */}
      <div className="rounded-xl border border-outline bg-panel px-5 py-5 flex flex-col gap-4">
        <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Configuração do Modelo</p>

        <Field label="Nome do modelo">
          <input
            className={inputBase}
            style={inputStyle}
            value={evaluationName}
            onChange={(e) => onEvaluationName(e.target.value)}
            placeholder="MorganBestModel"
          />
        </Field>

        <Field label="Score de consenso">
          <select
            className={inputBase}
            style={inputStyle}
            value={consensusType}
            onChange={(e) => onConsensusType(e.target.value)}
          >
            <option value="min-max">Min-Max (recomendado)</option>
            <option value="z-score">Z-Score</option>
          </select>
        </Field>

        <Field label="Trials Optuna" hint={trialsHint}>
          <input
            className={inputBase}
            style={inputStyle}
            type="number"
            min={1}
            value={nTrials}
            onChange={(e) => onNTrials(Math.max(1, Number(e.target.value)))}
            placeholder="20"
          />
        </Field>

        <Field label="Pasta do modelo" hint="caminho DH-relativo">
          <input
            className={inputBase}
            style={inputStyle}
            value={modelOutputPath}
            onChange={(e) => onModelOutputPath(e.target.value)}
            placeholder="/resultados/neurodock/model"
          />
        </Field>

        <Field label="Pasta dos gráficos" hint="caminho DH-relativo">
          <input
            className={inputBase}
            style={inputStyle}
            value={historyOutputPath}
            onChange={(e) => onHistoryOutputPath(e.target.value)}
            placeholder="/resultados/neurodock/plots"
          />
        </Field>

        {submitError && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
            <p className="font-mono text-[11px] text-red-400">{submitError}</p>
          </div>
        )}

        <button
          className="w-full font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" }}
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
              Iniciando treinamento...
            </>
          ) : (
            "Treinar Modelo Neural"
          )}
        </button>
      </div>
    </div>
  );
}

// ── RunningCard ───────────────────────────────────────────────────────────────

function RunningCard({ title, description, hint, onBack }: {
  title: string; description: string; hint: string; onBack?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 min-h-[60vh] text-center">
      <Spinner style={{ width: 36, height: 36, borderWidth: 3 }} />
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[14px] font-semibold text-foreground">{title}</p>
        <p className="font-mono text-[12px] text-foreground-subtle max-w-md">{description}</p>
        <p className="font-mono text-[11px] text-foreground-subtle opacity-60 mt-1 max-w-md">{hint}</p>
      </div>
      {onBack && (
        <button
          onClick={onBack}
          className="font-mono text-[12px] rounded-lg border px-4 py-2 transition-colors hover:bg-surface-secondary"
          style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
        >
          ← Voltar
        </button>
      )}
    </div>
  );
}

// ── TrainResultCard ───────────────────────────────────────────────────────────

function TrainResultCard({ model, plotBlobUrls, modelConfig, onRetrainNew }: {
  model: NeuroDockModelModel;
  plotBlobUrls: string[];
  modelConfig: Record<string, unknown> | null;
  onRetrainNew?: () => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const closeLightbox = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setLightbox(null);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.88)", zIndex: 9999 }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Gráfico ampliado"
            className="object-contain rounded-xl"
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              boxShadow: "0 0 60px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 font-mono text-[13px] rounded-lg border px-3 py-1.5 transition-colors"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff", background: "rgba(0,0,0,0.4)", zIndex: 10000 }}
          >
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Alvo</p>
          <p className="font-mono text-[14px] font-bold text-foreground">{model.target ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Modelo</p>
          <p className="font-mono text-[13px] font-bold text-foreground">{model.evaluation_name ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Alvos treinados</p>
          <p className="font-mono text-[20px] font-bold text-foreground">{model.n_targets ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Moléculas de treino</p>
          <p className="font-mono text-[20px] font-bold text-foreground">
            {model.n_train_mols != null ? model.n_train_mols.toLocaleString("pt-BR") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Fingerprint</p>
          <p className="font-mono text-[13px] font-bold text-foreground capitalize">{model.fingerprint_type ?? "—"}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onRetrainNew && (
            <button
              onClick={onRetrainNew}
              className="font-mono text-[12px] rounded-xl border px-4 py-3 transition-colors hover:bg-surface-secondary"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              ↺ Treinar novo modelo
            </button>
          )}
          <div className="rounded-xl border px-4 py-3 font-mono text-[12px] font-semibold flex items-center gap-1.5"
            style={{ borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" }}>
            ✓ Treinamento concluído
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {plotBlobUrls.length > 0 && (
        <div className="rounded-xl border border-outline bg-panel px-4 py-4 flex flex-col gap-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
            Histórico de treinamento — {plotBlobUrls.length} gráfico{plotBlobUrls.length !== 1 ? "s" : ""}
            <span className="ml-2 opacity-50 normal-case font-normal">clique para ampliar</span>
          </p>
          <div className={`flex flex-col gap-3 ${plotBlobUrls.length === 1 ? "items-center" : "grid grid-cols-1 sm:grid-cols-2"}`}>
            {plotBlobUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Gráfico de treino ${i + 1}`}
                onClick={() => setLightbox(url)}
                className="rounded-lg border border-outline object-contain bg-white cursor-zoom-in transition-opacity hover:opacity-90"
                style={{
                  maxHeight: plotBlobUrls.length === 1 ? "520px" : "360px",
                  width: plotBlobUrls.length === 1 ? "auto" : "100%",
                  maxWidth: "100%",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hiperparâmetros do modelo */}
      {modelConfig && <ModelConfigCard config={modelConfig} />}
    </div>
  );
}

// ── ModelConfigCard ───────────────────────────────────────────────────────────

const METRIC_DESCRIPTIONS: Record<string, string> = {
  mae: "Erro Absoluto Médio — diferença média entre valores preditos e reais (menor = melhor)",
  mse: "Erro Quadrático Médio — penaliza erros maiores de forma quadrática (menor = melhor)",
  rmse: "Raiz do Erro Quadrático Médio — interpretável na mesma unidade do alvo (menor = melhor)",
  r2: "R² — fração da variância explicada pelo modelo (1.0 = perfeito)",
  r2_score: "R² — fração da variância explicada pelo modelo (1.0 = perfeito)",
  pearson: "Correlação de Pearson — mede linearidade entre predições e valores reais (1.0 = perfeito)",
  spearman: "Correlação de Spearman — concordância de ordenação entre predições e valores reais (1.0 = perfeito)",
  accuracy: "Acurácia — proporção de classificações corretas (1.0 = perfeito)",
  auc: "AUC-ROC — capacidade de distinguir classes positivas e negativas (0.5 = aleatório, 1.0 = perfeito)",
  f1: "F1-Score — média harmônica entre precisão e revocação (1.0 = perfeito)",
  precision: "Precisão — proporção de positivos preditos que são realmente positivos",
  recall: "Revocação — proporção de positivos reais identificados corretamente",
};

function ModelConfigCard({ config }: { config: Record<string, unknown> }) {
  const optimizer = config.optimizer as Record<string, unknown> | undefined;
  const loss = config.loss as Record<string, unknown> | undefined;
  const hiddenUnits = config.hidden_units as number[] | undefined;
  const metrics = config.metrics as string[] | undefined;

  const fmt = (v: unknown, decimals = 6) =>
    typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(decimals)) : String(v ?? "—");

  return (
    <div className="rounded-xl border border-outline bg-panel px-4 py-4 flex flex-col gap-4">
      <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
        Hiperparâmetros
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {/* Arquitetura */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider opacity-70">Arquitetura da rede</p>
          {hiddenUnits && (
            <div>
              <span className="font-mono text-[10px] text-foreground-subtle">Camadas ocultas (neurônios por camada)</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {hiddenUnits.map((u, i) => (
                  <span key={i} className="font-mono text-[11px] rounded px-2 py-0.5 border"
                    style={{ borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" }}>
                    {u}
                  </span>
                ))}
              </div>
            </div>
          )}
          <ConfigRow label="Ativação oculta" value={fmt(config.hidden_activation)} hint="função de ativação das camadas intermediárias" />
          <ConfigRow label="Ativação saída" value={fmt(config.output_activation)} hint="função de ativação da camada de saída" />
          <ConfigRow label="Dropout máx." value={fmt(config.max_dropout, 4)} hint="taxa de dropout para regularização" />
          <ConfigRow label="L2 λ" value={fmt(config.l2_lambda, 6)} hint="penalidade de regularização L2 dos pesos" />
          <ConfigRow label="Batch size" value={fmt(config.batch_size)} hint="amostras por atualização dos pesos" />
          <ConfigRow label="Epochs" value={fmt(config.epochs)} hint="ciclos completos de treinamento" />
        </div>

        {/* Otimizador + treino */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider opacity-70">Otimizador</p>
          <ConfigRow label="Tipo" value={fmt(optimizer?.type)} hint="algoritmo de otimização dos gradientes" />
          <ConfigRow label="Learning rate" value={fmt(optimizer?.learning_rate, 6)} hint="tamanho do passo de atualização" />
          {optimizer?.beta_1 != null && <ConfigRow label="β₁" value={fmt(optimizer.beta_1, 4)} hint="decaimento do 1º momento (momento)" />}
          {optimizer?.beta_2 != null && <ConfigRow label="β₂" value={fmt(optimizer.beta_2, 4)} hint="decaimento do 2º momento (variância)" />}
          {optimizer?.epsilon != null && <ConfigRow label="ε" value={fmt(optimizer.epsilon, 6)} hint="estabilidade numérica" />}

          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider opacity-70 mt-2">Função de perda</p>
          <ConfigRow label="Função" value={fmt(loss?.type ?? config.loss)} hint="critério minimizado durante treino" />
          {loss?.delta != null && <ConfigRow label="Delta (Huber)" value={fmt(loss.delta, 4)} hint="limiar entre regiões quadrática e linear" />}

          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider opacity-70 mt-2">Divisão dos dados</p>
          <ConfigRow label="Teste" value={`${((config.test_size as number ?? 0) * 100).toFixed(0)}%`} hint="fração reservada para avaliação final" />
          <ConfigRow label="Validação" value={`${((config.validation_size as number ?? 0) * 100).toFixed(0)}%`} hint="fração usada para tuning dos hiperparâmetros" />
          <ConfigRow label="Folds (CV)" value={fmt(config.n_folds)} hint="validação cruzada k-fold" />
        </div>
      </div>

      {/* Métricas abordadas */}
      {metrics && metrics.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider opacity-70">Métricas abordadas</p>
          <div className="flex flex-wrap gap-1.5">
            {metrics.map((m) => {
              const desc = METRIC_DESCRIPTIONS[m.toLowerCase()];
              return desc ? (
                <Tooltip key={m} text={desc}>
                  <span className="font-mono text-[11px] rounded px-2 py-0.5 border border-outline bg-surface-secondary text-foreground font-semibold uppercase cursor-pointer underline decoration-dotted decoration-foreground-subtle/40 underline-offset-2">
                    {m}
                  </span>
                </Tooltip>
              ) : (
                <span key={m} className="font-mono text-[11px] rounded px-2 py-0.5 border border-outline bg-surface-secondary text-foreground font-semibold uppercase">
                  {m}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfigRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="grid gap-x-3" style={{ gridTemplateColumns: "10rem 1fr" }}>
      {hint ? (
        <Tooltip text={hint}>
          <span className="font-mono text-[11px] text-foreground-subtle cursor-pointer underline decoration-dotted decoration-foreground-subtle/40 underline-offset-2">
            {label}
          </span>
        </Tooltip>
      ) : (
        <span className="font-mono text-[11px] text-foreground-subtle">{label}</span>
      )}
      <span className="font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

// ── PredictForm ───────────────────────────────────────────────────────────────

interface PredictFormProps {
  libraryCsvPath: string; onLibraryCsvPath: (v: string) => void;
  inputDataset: string; onInputDataset: (v: string) => void;
  topK: string; onTopK: (v: string) => void;
  batchSize: string; onBatchSize: (v: string) => void;
  predictOutputPath: string; onPredictOutputPath: (v: string) => void;
  onSubmit: () => void; submitting: boolean; submitError: string | null;
}

function PredictForm({
  libraryCsvPath, onLibraryCsvPath,
  inputDataset, onInputDataset,
  topK, onTopK,
  batchSize, onBatchSize,
  predictOutputPath, onPredictOutputPath,
  onSubmit, submitting, submitError,
}: PredictFormProps) {
  const inputBase = "w-full rounded-lg border font-mono text-[12px] px-3 py-2 bg-surface-secondary text-foreground focus:outline-none focus:ring-1 transition-colors";
  const inputStyle = { borderColor: "var(--color-outline)" };
  const btnStyle = { borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" };

  return (
    <div className="rounded-xl border border-outline bg-panel px-5 py-5 flex flex-col gap-4">
      {/* Cabeçalho */}
      <div>
        <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider mb-1">Fase 2 — Triagem Virtual</p>
        <p className="font-mono text-[12px] text-foreground-subtle leading-relaxed">
          Forneça um CSV com a biblioteca de moléculas candidatas. Colunas obrigatórias:
          ID (<code className="text-[11px]">molecule_chembl_id</code> ou <code className="text-[11px]">zinc_id</code>) e
          SMILES (<code className="text-[11px]">smiles</code> ou <code className="text-[11px]">smile</code>).
          O modelo calcula os scores preditos e retorna as melhores colocadas.
        </p>
      </div>

      <Field label="CSV da biblioteca" hint="caminho absoluto no sistema de arquivos">
        <input
          className={inputBase}
          style={inputStyle}
          value={libraryCsvPath}
          onChange={(e) => onLibraryCsvPath(e.target.value)}
          placeholder="/home/usuario/datasets/biblioteca_moleculas.csv"
        />
      </Field>

      {/* ── Campos comuns ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nome do dataset" hint="identificador para os resultados">
          <input
            className={inputBase}
            style={inputStyle}
            value={inputDataset}
            onChange={(e) => onInputDataset(e.target.value)}
            placeholder="ZINC"
          />
        </Field>
        <Field label="Pasta de saída" hint="caminho DH-relativo">
          <input
            className={inputBase}
            style={inputStyle}
            value={predictOutputPath}
            onChange={(e) => onPredictOutputPath(e.target.value)}
            placeholder="/resultados/neurodock/predictions"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Top-K moléculas" hint="melhores a retornar">
          <input
            className={inputBase}
            style={inputStyle}
            type="number"
            min={1}
            value={topK}
            onChange={(e) => onTopK(e.target.value)}
          />
        </Field>
        <Field label="Batch size" hint="moléculas por lote">
          <input
            className={inputBase}
            style={inputStyle}
            type="number"
            min={100}
            value={batchSize}
            onChange={(e) => onBatchSize(e.target.value)}
          />
        </Field>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
          <p className="font-mono text-[11px] text-red-400">{submitError}</p>
        </div>
      )}

      <button
        className="w-full font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={btnStyle}
        onClick={onSubmit}
        disabled={submitting || !libraryCsvPath.trim()}
      >
        {submitting ? (
          <>
            <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
            Iniciando triagem...
          </>
        ) : (
          "Executar Triagem Virtual"
        )}
      </button>
    </div>
  );
}

// ── ResultsView ───────────────────────────────────────────────────────────────

interface ResultsViewProps {
  model: NeuroDockModelModel;
  prediction: NeuroDockPredictionModel;
  topMolecules: NeuroDockTopMolecule[];
  topColumns: string[];
  onDownloadTop: () => void;
  onNewPrediction: () => void;
  onRetrainNew: () => void;
  plotBlobUrls: string[];
  modelConfig: Record<string, unknown> | null;
}

interface MolLightbox { id: string; smiles: string; scores: Record<string, string | number> }

function ResultsView({ model, prediction, topMolecules, topColumns, onDownloadTop, onNewPrediction, onRetrainNew, plotBlobUrls, modelConfig }: ResultsViewProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [molLightbox, setMolLightbox] = useState<MolLightbox | null>(null);
  const idColumns = ["molecule_chembl_id", "zinc_id", "canonical_smiles", "smile", "smiles"];
  const scoreColumns = topColumns.filter((c) => !idColumns.includes(c.toLowerCase()));
  const hasSmilesColumn = topMolecules.some((m) => m.smiles && m.smiles.trim() !== "");

  return (
    <div className="flex flex-col gap-6">
      {/* Lightbox — gráficos */}
      {lightbox && (
        <div
          className="fixed inset-0 flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.88)", zIndex: 9999 }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Gráfico ampliado"
            className="object-contain rounded-xl"
            style={{ maxWidth: "90vw", maxHeight: "85vh", boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => { e.stopPropagation(); setLightbox(null); }}
            className="absolute top-4 right-4 font-mono text-[13px] rounded-lg border px-3 py-1.5"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#fff", background: "rgba(0,0,0,0.4)", zIndex: 10000 }}
          >
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Modal — estrutura molecular (mesmo padrão do ChEMBL) */}
      {molLightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setMolLightbox(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-outline bg-panel p-5 flex flex-col gap-4 shadow-menu mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[13px] font-bold text-foreground">{molLightbox.id}</span>
              <button
                type="button"
                onClick={() => setMolLightbox(null)}
                className="cursor-pointer rounded border-none bg-transparent p-1 text-foreground-subtle hover:text-foreground transition-colors"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="flex justify-center">
              <MoleculeCanvas smiles={molLightbox.smiles} width={300} height={200} />
            </div>
            <div className="flex flex-col gap-1.5">
              <MolMetaRow label="SMILES" value={molLightbox.smiles} mono />
              {Object.entries(molLightbox.scores).map(([k, v]) => (
                <MolMetaRow key={k} label={k} value={typeof v === "number" ? v.toFixed(4) : String(v)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Alvo</p>
          <p className="font-mono text-[14px] font-bold text-foreground">{model.target ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Modelo</p>
          <p className="font-mono text-[13px] font-bold text-foreground">{model.evaluation_name ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Dataset</p>
          <p className="font-mono text-[13px] font-bold text-foreground">{prediction.input_dataset}</p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Moléculas triadas</p>
          <p className="font-mono text-[20px] font-bold text-foreground">
            {prediction.n_screened != null ? prediction.n_screened.toLocaleString("pt-BR") : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-outline bg-panel px-4 py-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Top selecionadas</p>
          <p className="font-mono text-[20px] font-bold text-foreground" style={{ color: "#22c55e" }}>
            {prediction.n_selected != null ? prediction.n_selected.toLocaleString("pt-BR") : "—"}
          </p>
        </div>

        {/* Ações */}
        <div className="ml-auto flex gap-2 items-center flex-wrap">
          {model.clustering_job_id != null && (
            <button
              onClick={onRetrainNew}
              className="font-mono text-[12px] rounded-xl border px-4 py-3 transition-all hover:bg-surface-secondary"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              ↺ Treinar novo modelo
            </button>
          )}
          <button
            onClick={onNewPrediction}
            className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:bg-surface-secondary"
            style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
          >
            + Nova Triagem
          </button>
          <button
            onClick={onDownloadTop}
            className="font-mono text-[12px] rounded-xl border px-4 py-3 font-semibold transition-all hover:opacity-80"
            style={{ borderColor: "var(--color-accent-25)", color: "var(--color-accent)", background: "var(--color-accent-12)" }}
          >
            ↓ Top-{prediction.top_k}
          </button>
        </div>
      </div>

      {/* Gráficos de treino */}
      {plotBlobUrls.length > 0 && (
        <div className="rounded-xl border border-outline bg-panel px-4 py-4 flex flex-col gap-3">
          <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
            Histórico de treinamento — {plotBlobUrls.length} gráfico{plotBlobUrls.length !== 1 ? "s" : ""}
            <span className="ml-2 opacity-50 normal-case font-normal">clique para ampliar</span>
          </p>
          <div className={`flex flex-col gap-3 ${plotBlobUrls.length === 1 ? "items-center" : "grid grid-cols-1 sm:grid-cols-2"}`}>
            {plotBlobUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Gráfico ${i + 1}`}
                onClick={() => setLightbox(url)}
                className="rounded-lg border border-outline object-contain bg-white cursor-zoom-in hover:opacity-90 transition-opacity"
                style={{
                  maxHeight: plotBlobUrls.length === 1 ? "520px" : "360px",
                  width: plotBlobUrls.length === 1 ? "auto" : "100%",
                  maxWidth: "100%",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hiperparâmetros do modelo */}
      {modelConfig && <ModelConfigCard config={modelConfig} />}

      {/* Tabela de moléculas */}
      {topMolecules.length > 0 && (
        <div className="rounded-xl border border-outline bg-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-outline">
            <p className="font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">
              Top-{prediction.top_k} Moléculas — {topMolecules.length} exibidas
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline bg-surface-secondary">
                  <th className="px-3 py-2 text-left font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-left font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">ID</th>
                  {scoreColumns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">{col}</th>
                  ))}
                  {hasSmilesColumn && (
                    <th className="px-3 py-2 text-left font-mono text-[10px] text-foreground-subtle uppercase tracking-wider">Estrutura</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {topMolecules.slice(0, 100).map((mol, i) => (
                  <tr key={i} className="border-b border-outline hover:bg-surface-secondary transition-colors">
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground-subtle">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-[11px] text-foreground">{mol.id}</td>
                    {scoreColumns.map((col) => (
                      <td key={col} className="px-3 py-2 font-mono text-[11px] text-foreground">
                        {typeof mol[col] === "number"
                          ? (mol[col] as number).toFixed(4)
                          : String(mol[col] ?? "—")}
                      </td>
                    ))}
                    {hasSmilesColumn && (
                      <td className="px-3 py-2">
                        {mol.smiles ? (
                          <button
                            onClick={() => setMolLightbox({
                              id: mol.id,
                              smiles: mol.smiles,
                              scores: Object.fromEntries(scoreColumns.map((c) => [c, mol[c] as string | number])),
                            })}
                            className="font-mono text-[11px] rounded-lg border px-3 py-1 transition-colors hover:bg-surface-secondary cursor-pointer"
                            style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
                          >
                            Ver
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] text-foreground-subtle opacity-40">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {topMolecules.length > 100 && (
              <p className="font-mono text-[11px] text-foreground-subtle px-4 py-2">
                Exibindo 100 de {topMolecules.length}. Baixe o CSV para ver todas.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function MoleculeCanvas({ smiles, width = 120, height = 80 }: { smiles: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !smiles) return;
    try {
      const drawer = new SmilesDrawer.Drawer({ width, height, compactDrawing: false });
      SmilesDrawer.parse(
        smiles,
        (tree: unknown) => { drawer.draw(tree, canvas, "light", false); },
        () => { /* SMILES inválido — silencia */ },
      );
    } catch { /* silencia */ }
  }, [smiles, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: "block", background: "white", borderRadius: 4 }}
    />
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            background: "var(--color-surface-secondary)",
            border: "1px solid var(--color-outline)",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 10,
            fontFamily: "monospace",
            color: "var(--color-foreground-subtle)",
            whiteSpace: "normal",
            width: "max-content",
            maxWidth: 280,
            textAlign: "left",
            boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            lineHeight: 1.5,
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

function MolMetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-2 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle w-[70px] shrink-0 pt-0.5">
        {label}
      </span>
      <span className={`text-[12px] text-foreground break-all ${mono ? "font-mono text-[11px]" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[11px] font-medium text-foreground-subtle">
        {label}
        {hint && <span className="ml-1 opacity-60 font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
