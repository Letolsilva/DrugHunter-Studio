// data/usecases/consensus.usecase.ts
import { IConsensusUseCase } from "../../domain/interfaces/consensus.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { ConsensusJobModel, ConsensusRedockingJobsResponse } from "../../domain/models/consensus.model";
import { HttpError } from "../../infra/http/httpClient";

export class ConsensusUseCase extends IConsensusUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async iniciar(
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
  ): Promise<ConsensusJobModel> {
    const res = await this.httpClient.post<ConsensusJobModel>(
      "/consensus/iniciar",
      {
        admet_result_id: admetResultId,
        selected_categories: selectedCategories,
        pdb_id: pdbId,
        ligand_resname: ligandResname,
        ligand_resnum: ligandResnum,
        chain,
        base_input_path: baseInputPath,
        base_docking_output_path: baseDockingOutputPath,
        charge_type: chargeType,
        prepare_complex: prepareComplex,
        ...(maxMols != null ? { max_mols: maxMols } : {}),
      },
      { token },
    );
    return res.data;
  }

  async getJob(jobId: number, token: string): Promise<ConsensusJobModel> {
    const res = await this.httpClient.get<ConsensusJobModel>(
      `/consensus/${jobId}`,
      { token },
    );
    return res.data;
  }

  async getByAdmet(admetResultId: number, token: string): Promise<ConsensusJobModel | null> {
    try {
      const res = await this.httpClient.get<ConsensusJobModel>(
        `/consensus/by-admet/${admetResultId}`,
        { token },
      );
      return res.data;
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  async getRedockingJobs(token: string): Promise<ConsensusRedockingJobsResponse> {
    const res = await this.httpClient.get<ConsensusRedockingJobsResponse>(
      "/consensus/redocking-jobs",
      { token },
    );
    return res.data;
  }
}
