// domain/interfaces/search.interface.ts
import type { SearchEventModel } from "../models/search.model";

export abstract class ISearchUseCase {
  abstract createStream(
    proteinas: string,
    token: string,
    forcarNovo?: boolean,
    limite?: number | null,
  ): EventSource;
  abstract adaptEvent(ev: SearchEventModel): SearchEventModel;
  abstract cancelarParcial(
    proteinas_query: string,
    token?: string,
  ): Promise<void>;
}
