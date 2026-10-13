// domain/interfaces/neurodock.interface.ts
import type {
  NeuroDockModelModel,
  NeuroDockPredictionModel,
  NeuroDockPlotInfo,
} from "../models/neurodock.model";

export abstract class INeuroDockUseCase {
  abstract treinar(
    clusteringJobId: number,
    evaluationName: string,
    consensusType: string,
    modelOutputPath: string,
    historyOutputPath: string,
    token: string,
    nTrials?: number,
  ): Promise<NeuroDockModelModel>;

  abstract getModel(modelId: number, token: string): Promise<NeuroDockModelModel>;

  abstract cancelarTreino(id: number, token: string): Promise<void>;

  abstract cancelarTriagem(id: number, token: string): Promise<void>;

  abstract getModelByClustering(
    clusteringJobId: number,
    token: string,
  ): Promise<NeuroDockModelModel>;

  abstract getPlotsCount(modelId: number, token: string): Promise<NeuroDockPlotInfo>;

  abstract iniciarTriagem(
    modelId: number,
    libraryCsvPath: string,
    inputDataset: string,
    topK: number,
    batchSize: number,
    baseOutputPath: string,
    token: string,
  ): Promise<NeuroDockPredictionModel>;

  abstract getPrediction(
    predId: number,
    token: string,
  ): Promise<NeuroDockPredictionModel>;

  abstract getLatestPrediction(
    modelId: number,
    token: string,
  ): Promise<NeuroDockPredictionModel>;

  abstract getModelConfig(
    modelId: number,
    token: string,
  ): Promise<Record<string, unknown>>;
}
