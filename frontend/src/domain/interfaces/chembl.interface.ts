// domain/interfaces/chembl.interface.ts
import type { ChemblJobModel, ChemblMoleculeModel, NetworkInfo } from "../models/chembl.model";

export abstract class IChemblUseCase {
  abstract startJob(payload: object, token: string): Promise<ChemblJobModel>;

  abstract listarJobs(token: string): Promise<{ jobs: ChemblJobModel[] }>;

  abstract iniciarAnalise(
    payload: {
      job_id: number;
      fingerprint: string;
      metric: string;
      base_output_path: string;
    },
    token: string,
  ): Promise<void>;

  abstract deletarJob(jobId: number, token: string): Promise<void>;

  abstract cancelar(id: number, token: string): Promise<void>;

  abstract getJob(jobId: number, token: string): Promise<ChemblJobModel>;

  abstract listarMoleculas(
    jobId: number,
    token: string,
    page?: number,
    perPage?: number,
  ): Promise<{ molecules: ChemblMoleculeModel[]; total: number; page: number; per_page: number }>;

  abstract getAnalysisStatus(
    jobId: number,
    token: string,
  ): Promise<{ has_analysis: boolean; analysis_running: boolean; centroids_count: number; similarity_files: string[]; mcc_ids: string[]; mcc_sims_ids: string[]; mcc_mols_ids: string[]; dh_failed_targets: string[]; analysis_error: string | null }>;

  abstract getNetworks(jobId: number, token: string): Promise<{ networks: NetworkInfo[] }>;

  abstract getPlotUrl(jobId: number, filename: string, token: string): string;
}
