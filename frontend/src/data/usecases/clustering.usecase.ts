// data/usecases/clustering.usecase.ts
import { IClusteringUseCase } from "../../domain/interfaces/clustering.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { ClusteringJobModel } from "../../domain/models/clustering.model";
import { HttpError } from "../../infra/http/httpClient";

export class ClusteringUseCase extends IClusteringUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async iniciar(
    admetResultId: number,
    fingerprintType: string,
    baseOutputPath: string,
    token: string,
    maxMols?: number | null,
  ): Promise<ClusteringJobModel> {
    const res = await this.httpClient.post<ClusteringJobModel>(
      "/clustering/iniciar",
      {
        admet_result_id: admetResultId,
        fingerprint_type: fingerprintType,
        base_output_path: baseOutputPath,
        max_mols: maxMols ?? null,
      },
      { token },
    );
    return res.data;
  }

  async getJob(jobId: number, token: string): Promise<ClusteringJobModel> {
    const res = await this.httpClient.get<ClusteringJobModel>(
      `/clustering/${jobId}`,
      { token },
    );
    return res.data;
  }

  async getByAdmet(admetResultId: number, token: string): Promise<ClusteringJobModel | null> {
    try {
      const res = await this.httpClient.get<ClusteringJobModel>(
        `/clustering/by-admet/${admetResultId}`,
        { token },
      );
      return res.data;
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  async list(token: string): Promise<ClusteringJobModel[]> {
    const res = await this.httpClient.get<ClusteringJobModel[]>(
      "/clustering/list",
      { token },
    );
    return res.data;
  }

  async delete(jobId: number, token: string): Promise<void> {
    await this.httpClient.delete(`/clustering/${jobId}`, { token });
  }
}
