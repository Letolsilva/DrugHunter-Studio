// data/usecases/neurodock.usecase.ts
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import { cancelarJob } from "./cancelar_job";
import { INeuroDockUseCase } from "../../domain/interfaces/neurodock.interface";
import type {
  NeuroDockModelModel,
  NeuroDockPredictionModel,
  NeuroDockPlotInfo,
} from "../../domain/models/neurodock.model";

export class NeuroDockUseCase extends INeuroDockUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async cancelarTreino(id: number, token: string): Promise<void> {
    await cancelarJob(this.httpClient, "neurodock-model", id, token);
  }

  async cancelarTriagem(id: number, token: string): Promise<void> {
    await cancelarJob(this.httpClient, "neurodock-prediction", id, token);
  }

  async treinar(
    clusteringJobId: number,
    evaluationName: string,
    consensusType: string,
    modelOutputPath: string,
    historyOutputPath: string,
    token: string,
    nTrials: number = 20,
  ): Promise<NeuroDockModelModel> {
    const res = await this.httpClient.post<NeuroDockModelModel>(
      "/neurodock/treinar",
      {
        clustering_job_id: clusteringJobId,
        evaluation_name: evaluationName,
        consensus_type: consensusType,
        model_output_path: modelOutputPath,
        history_output_path: historyOutputPath,
        n_trials: nTrials,
      },
      { token },
    );
    return res.data;
  }

  async getModel(modelId: number, token: string): Promise<NeuroDockModelModel> {
    const res = await this.httpClient.get<NeuroDockModelModel>(
      `/neurodock/model/${modelId}`,
      { token },
    );
    return res.data;
  }

  async getModelByClustering(
    clusteringJobId: number,
    token: string,
  ): Promise<NeuroDockModelModel> {
    const res = await this.httpClient.get<NeuroDockModelModel>(
      `/neurodock/by-clustering/${clusteringJobId}`,
      { token },
    );
    return res.data;
  }

  async getPlotsCount(modelId: number, token: string): Promise<NeuroDockPlotInfo> {
    const res = await this.httpClient.get<NeuroDockPlotInfo>(
      `/neurodock/model/${modelId}/plots/count`,
      { token },
    );
    return res.data;
  }

  async iniciarTriagem(
    modelId: number,
    libraryCsvPath: string,
    inputDataset: string,
    topK: number,
    batchSize: number,
    baseOutputPath: string,
    token: string,
  ): Promise<NeuroDockPredictionModel> {
    const res = await this.httpClient.post<NeuroDockPredictionModel>(
      `/neurodock/model/${modelId}/predict`,
      {
        library_csv_path: libraryCsvPath,
        input_dataset: inputDataset,
        top_k: topK,
        batch_size: batchSize,
        base_output_path: baseOutputPath,
      },
      { token },
    );
    return res.data;
  }

  async getPrediction(
    predId: number,
    token: string,
  ): Promise<NeuroDockPredictionModel> {
    const res = await this.httpClient.get<NeuroDockPredictionModel>(
      `/neurodock/prediction/${predId}`,
      { token },
    );
    return res.data;
  }

  async getLatestPrediction(
    modelId: number,
    token: string,
  ): Promise<NeuroDockPredictionModel> {
    const res = await this.httpClient.get<NeuroDockPredictionModel>(
      `/neurodock/model/${modelId}/prediction/latest`,
      { token },
    );
    return res.data;
  }

  async getModelConfig(modelId: number, token: string): Promise<Record<string, unknown>> {
    const res = await this.httpClient.get<Record<string, unknown>>(
      `/neurodock/model/${modelId}/config`,
      { token },
    );
    return res.data;
  }
}
