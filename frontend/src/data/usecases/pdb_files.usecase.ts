// data/usecases/pdb_files.usecase.ts
import { IPdbFilesUseCase } from "../../domain/interfaces/pdb_files.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { PdbFileModel } from "../../domain/models/pdb_files.model";
import { adaptPdbFile } from "../adapters/pdb_files.adapter";

export class PdbFilesUseCase extends IPdbFilesUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async listar(token: string): Promise<PdbFileModel[]> {
    const res = await this.httpClient.get<unknown[]>("/download/meus-pdbs", {
      token,
    });
    return (res.data as Parameters<typeof adaptPdbFile>[0][]).map(adaptPdbFile);
  }

  async remover(pdb_id: string, token: string): Promise<void> {
    await this.httpClient.delete(`/download/meus-pdbs/${pdb_id}`, { token });
  }
}
