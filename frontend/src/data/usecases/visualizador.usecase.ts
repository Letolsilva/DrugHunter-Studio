// data/usecases/visualizador.usecase.ts
import { IVisualizadorUseCase } from "../../domain/interfaces/visualizador.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { PdbArvore } from "../../domain/models/visualizador.model";

export class VisualizadorUseCase extends IVisualizadorUseCase {
  protected httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async getArvore(pdb_id: string, token: string): Promise<PdbArvore> {
    const res = await this.httpClient.get<PdbArvore>(
      `/download/visualizar/${pdb_id}`,
      { token },
    );
    return res.data;
  }

  async getLinhasGrupo(
    pdb_id: string,
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
    token: string,
  ): Promise<string[]> {
    const params = new URLSearchParams({ tipo, resname, chain, resnum });
    const res = await this.httpClient.get<{ linhas: string[] }>(
      `/download/visualizar/${pdb_id}/linhas?${params}`,
      { token },
    );
    return res.data.linhas;
  }
}
