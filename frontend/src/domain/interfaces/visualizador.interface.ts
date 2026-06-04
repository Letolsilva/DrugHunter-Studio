// domain/interfaces/visualizador.interface.ts
import type { PdbArvore } from "../models/visualizador.model";

export abstract class IVisualizadorUseCase {
  abstract getArvore(pdb_id: string, token: string): Promise<PdbArvore>;
  abstract getLinhasGrupo(
    pdb_id: string,
    tipo: string,
    resname: string,
    chain: string,
    resnum: string,
    token: string,
  ): Promise<string[]>;
}
