// domain/interfaces/admet.interface.ts
import type { AdmetMoleculesResponse, AdmetResultModel } from "../models/admet.model";

export abstract class IAdmetUseCase {
  abstract run(itemId: number, token: string): Promise<AdmetResultModel>;
  abstract getResult(resultId: number, token: string): Promise<AdmetResultModel>;
  abstract cancelar(id: number, token: string): Promise<void>;
  abstract getByItem(itemId: number, token: string): Promise<AdmetResultModel | null>;
  abstract listMolecules(
    resultId: number,
    token: string,
    page?: number,
    perPage?: number,
    bbb?: string,
    hia?: string,
  ): Promise<AdmetMoleculesResponse>;
  abstract downloadUrl(resultId: number, tipo: string, token: string): string;
}
