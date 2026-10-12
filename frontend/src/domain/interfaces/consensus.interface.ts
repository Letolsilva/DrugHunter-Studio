// domain/interfaces/consensus.interface.ts
import type {
  ConsensusJobModel,
  ConsensusRedockingJobsResponse,
} from "../models/consensus.model";

export abstract class IConsensusUseCase {
  abstract iniciar(
    admetResultId: number,
    selectedCategories: string[],
    pdbId: string,
    ligandResname: string,
    ligandResnum: number,
    chain: string,
    baseInputPath: string,
    baseDockingOutputPath: string,
    chargeType: string,
    prepareComplex: boolean,
    token: string,
    maxMols?: number | null,
  ): Promise<ConsensusJobModel>;

  abstract getJob(jobId: number, token: string): Promise<ConsensusJobModel>;

  abstract cancelarConsenso(id: number, token: string): Promise<void>;

  abstract getByAdmet(admetResultId: number, token: string): Promise<ConsensusJobModel | null>;

  abstract getRedockingJobs(token: string): Promise<ConsensusRedockingJobsResponse>;

  correlationUrl(jobId: number): string {
    return `/api/consensus/${jobId}/correlation`;
  }

  downloadUrl(jobId: number): string {
    return `/api/consensus/${jobId}/download`;
  }
}
