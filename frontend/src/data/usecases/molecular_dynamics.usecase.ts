// data/usecases/molecular_dynamics.usecase.ts
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import { IMolecularDynamicsUseCase } from "../../domain/interfaces/molecular_dynamics.interface";
import type {
  IniciarMDPayload,
  MDJobModel,
  MDLiganteInfo,
  MDReceptorInfo,
  MDConsensusJobOption,
  MDUploadResponse,
  MdAnalysisJobModel,
  MdAnalysisFilesModel,
} from "../../domain/models/molecular_dynamics.model";

interface FilesResponse {
  files: string[];
}

export class MolecularDynamicsUseCase extends IMolecularDynamicsUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async uploadLigante(file: File, token: string): Promise<MDUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/molecular-dynamics/upload/ligante", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ${res.status}`);
    }
    return res.json();
  }

  async uploadReceptor(file: File, token: string): Promise<MDUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/molecular-dynamics/upload/receptor", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail ?? `Erro ${res.status}`);
    }
    return res.json();
  }

  async listarJobsConsensus(token: string): Promise<MDConsensusJobOption[]> {
    const res = await this.httpClient.get<MDConsensusJobOption[]>(
      "/molecular-dynamics/consensus-jobs",
      { token },
    );
    return res.data;
  }

  async listarLigantesConsensus(consensusJobId: number, token: string): Promise<MDLiganteInfo[]> {
    const res = await this.httpClient.get<MDLiganteInfo[]>(
      `/molecular-dynamics/consensus/${consensusJobId}/ligantes`,
      { token },
    );
    return res.data;
  }

  async listarReceptoresConsensus(consensusJobId: number, token: string): Promise<MDReceptorInfo[]> {
    const res = await this.httpClient.get<MDReceptorInfo[]>(
      `/molecular-dynamics/consensus/${consensusJobId}/receptores`,
      { token },
    );
    return res.data;
  }

  async iniciarMD(payload: IniciarMDPayload, token: string): Promise<MDJobModel> {
    const res = await this.httpClient.post<MDJobModel>(
      "/molecular-dynamics/iniciar",
      payload,
      { token },
    );
    return res.data;
  }

  async listarJobs(token: string): Promise<MDJobModel[]> {
    const res = await this.httpClient.get<MDJobModel[]>(
      "/molecular-dynamics/jobs",
      { token },
    );
    return res.data;
  }

  async getJob(jobId: number, token: string): Promise<MDJobModel> {
    const res = await this.httpClient.get<MDJobModel>(
      `/molecular-dynamics/job/${jobId}`,
      { token },
    );
    return res.data;
  }

  async deletarJob(jobId: number, token: string): Promise<void> {
    await this.httpClient.delete(`/molecular-dynamics/job/${jobId}`, { token });
  }

  async listarArquivos(jobId: number, token: string): Promise<string[]> {
    const res = await this.httpClient.get<FilesResponse>(
      `/molecular-dynamics/job/${jobId}/files`,
      { token },
    );
    return res.data.files;
  }

  getDownloadUrl(jobId: number, filename: string): string {
    return `/api/molecular-dynamics/job/${jobId}/download/${encodeURIComponent(filename)}`;
  }

  async iniciarAnalise(jobId: number, token: string): Promise<MdAnalysisJobModel> {
    const res = await this.httpClient.post<MdAnalysisJobModel>(
      `/molecular-dynamics/job/${jobId}/analyse`,
      {},
      { token },
    );
    return res.data;
  }

  async getAnalise(jobId: number, token: string): Promise<MdAnalysisJobModel | null> {
    try {
      const res = await this.httpClient.get<MdAnalysisJobModel>(
        `/molecular-dynamics/job/${jobId}/analysis`,
        { token },
      );
      return res.data;
    } catch {
      return null;
    }
  }

  getAnaliseViewUrl(jobId: number, subdir: "analysis" | "visualization", filename: string): string {
    return `/api/molecular-dynamics/job/${jobId}/analysis/view/${subdir}/${encodeURIComponent(filename)}`;
  }

  async listarArquivosAnalise(jobId: number, token: string): Promise<MdAnalysisFilesModel> {
    const res = await this.httpClient.get<MdAnalysisFilesModel>(
      `/molecular-dynamics/job/${jobId}/analysis/files`,
      { token },
    );
    return res.data;
  }
}
