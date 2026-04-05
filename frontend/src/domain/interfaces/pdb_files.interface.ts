// domain/interfaces/pdb_files.interface.ts
import type { PdbFileModel } from "../models/pdb_files.model";

export abstract class IPdbFilesUseCase {
  abstract listar(token: string): Promise<PdbFileModel[]>;
  abstract remover(pdb_id: string, token: string): Promise<void>;
}
