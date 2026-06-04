// data/usecases/visualizador_cif.usecase.ts
import { VisualizadorUseCase } from "./visualizador.usecase";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { PdbArvore } from "../../domain/models/visualizador.model";

export class VisualizadorCifUseCase extends VisualizadorUseCase {
  constructor(httpClient: IHTTPClient) {
    super(httpClient);
  }

  async getArvore(pdb_id: string, token: string): Promise<PdbArvore> {
    const res = await this.httpClient.get<PdbArvore>(
      `/download/visualizar-cif/${pdb_id}`,
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
      `/download/visualizar-cif/${pdb_id}/linhas?${params}`,
      { token },
    );
    return res.data.linhas;
  }
}
