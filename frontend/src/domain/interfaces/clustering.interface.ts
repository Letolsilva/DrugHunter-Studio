// domain/interfaces/clustering.interface.ts
import type { ClusteringJobModel } from "../models/clustering.model";

export abstract class IClusteringUseCase {
  abstract iniciar(
    admetResultId: number,
    fingerprintType: string,
    baseOutputPath: string,
    token: string,
    maxMols?: number | null,
  ): Promise<ClusteringJobModel>;

  abstract getJob(jobId: number, token: string): Promise<ClusteringJobModel>;

  abstract cancelar(id: number, token: string): Promise<void>;

  abstract getByAdmet(admetResultId: number, token: string): Promise<ClusteringJobModel | null>;

  plotUrl(jobId: number): string {
    return `/api/clustering/${jobId}/plot`;
  }

  centroidUrl(jobId: number, clusterId: number): string {
    return `/api/clustering/${jobId}/centroid/${clusterId}`;
  }

  downloadUrl(jobId: number): string {
    return `/api/clustering/${jobId}/download`;
  }
}
