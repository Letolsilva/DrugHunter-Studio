// data/usecases/chembl.usecase.ts
import { IChemblUseCase } from "../../domain/interfaces/chembl.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { ChemblJobModel, ChemblMoleculeModel, NetworkInfo } from "../../domain/models/chembl.model";

export class ChemblUseCase extends IChemblUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async startJob(payload: object, token: string): Promise<ChemblJobModel> {
    const res = await this.httpClient.post<ChemblJobModel>("/chembl/run", payload, { token });
    return res.data;
  }

  async listarJobs(token: string): Promise<{ jobs: ChemblJobModel[] }> {
    const res = await this.httpClient.get<{ jobs: ChemblJobModel[] }>(
      "/chembl/jobs",
      { token },
    );
    return res.data;
  }

  async iniciarAnalise(
    payload: {
      job_id: number;
      fingerprint: string;
      metric: string;
      base_output_path: string;
    },
    token: string,
  ): Promise<void> {
    await this.httpClient.post("/chembl/analise", payload, { token });
  }

  async deletarJob(jobId: number, token: string): Promise<void> {
    await this.httpClient.delete(`/chembl/jobs/${jobId}`, { token });
  }

  async getJob(jobId: number, token: string): Promise<ChemblJobModel> {
    const res = await this.httpClient.get<ChemblJobModel>(`/chembl/jobs/${jobId}`, { token });
    return res.data;
  }

  async listarMoleculas(
    jobId: number,
    token: string,
    page = 1,
    perPage = 50,
  ): Promise<{ molecules: ChemblMoleculeModel[]; total: number; page: number; per_page: number }> {
    const res = await this.httpClient.get<{
      molecules: ChemblMoleculeModel[];
      total: number;
      page: number;
      per_page: number;
    }>(`/chembl/jobs/${jobId}/molecules?page=${page}&per_page=${perPage}`, { token });
    return res.data;
  }

  async getAnalysisStatus(
    jobId: number,
    token: string,
  ): Promise<{ has_analysis: boolean; analysis_running: boolean; centroids_count: number; similarity_files: string[]; mcc_ids: string[]; mcc_sims_ids: string[]; mcc_mols_ids: string[]; dh_failed_targets: string[] }> {
    const res = await this.httpClient.get<{
      has_analysis: boolean;
      analysis_running: boolean;
      centroids_count: number;
      similarity_files: string[];
      mcc_ids: string[];
      mcc_sims_ids: string[];
      mcc_mols_ids: string[];
      dh_failed_targets: string[];
    }>(`/chembl/jobs/${jobId}/analysis-status`, { token });
    return res.data;
  }

  async getNetworks(jobId: number, token: string): Promise<{ networks: NetworkInfo[] }> {
    const res = await this.httpClient.get<{ networks: NetworkInfo[] }>(
      `/chembl/jobs/${jobId}/networks`,
      { token },
    );
    return res.data;
  }

  getPlotUrl(jobId: number, filename: string, token: string): string {
    return `/api/chembl/jobs/${jobId}/plot/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
  }
}
