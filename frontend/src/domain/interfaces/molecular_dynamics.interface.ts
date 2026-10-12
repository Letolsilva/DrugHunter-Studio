// domain/interfaces/molecular_dynamics.interface.ts
import type {
  IniciarMDPayload,
  MDConsensusJobOption,
  MDJobModel,
  MDLiganteInfo,
  MDReceptorInfo,
  MDUploadResponse,
  MdAnalysisJobModel,
  MdAnalysisFilesModel,
} from "../models/molecular_dynamics.model";

export abstract class IMolecularDynamicsUseCase {
  abstract uploadLigante(file: File, token: string): Promise<MDUploadResponse>;
  abstract uploadReceptor(file: File, token: string): Promise<MDUploadResponse>;
  abstract listarJobsConsensus(token: string): Promise<MDConsensusJobOption[]>;
  abstract listarLigantesConsensus(consensusJobId: number, token: string): Promise<MDLiganteInfo[]>;
  abstract listarReceptoresConsensus(consensusJobId: number, token: string): Promise<MDReceptorInfo[]>;
  abstract iniciarMD(payload: IniciarMDPayload, token: string): Promise<MDJobModel>;
  abstract listarJobs(token: string): Promise<MDJobModel[]>;
  abstract getJob(jobId: number, token: string): Promise<MDJobModel>;
  abstract deletarJob(jobId: number, token: string): Promise<void>;
  abstract cancelarSimulacao(jobId: number, token: string): Promise<void>;
  abstract cancelarAnalise(analysisId: number, token: string): Promise<void>;
  abstract listarArquivos(jobId: number, token: string): Promise<string[]>;
  abstract getDownloadUrl(jobId: number, filename: string): string;
  abstract iniciarAnalise(jobId: number, token: string): Promise<MdAnalysisJobModel>;
  abstract getAnalise(jobId: number, token: string): Promise<MdAnalysisJobModel | null>;
  abstract listarArquivosAnalise(jobId: number, token: string): Promise<MdAnalysisFilesModel>;
  abstract getAnaliseViewUrl(jobId: number, subdir: "analysis" | "visualization", filename: string): string;
}
