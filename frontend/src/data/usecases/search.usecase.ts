// data/usecases/search.usecase.ts
import { ISearchUseCase } from "../../domain/interfaces/search.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { SearchEventModel } from "../../domain/models/search.model";
import { adaptSearchResult } from "../adapters/search.adapter";

const API_BASE = "/api";

export class SearchUseCase extends ISearchUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  createStream(
    proteinas: string,
    token: string,
    forcarNovo = false,
    limite: number | null = null,
  ): EventSource {
    const params = new URLSearchParams({ proteinas: proteinas.trim() });
    if (forcarNovo) params.set("forcar_novo", "true");
    if (token) params.set("token", token);
    if (limite !== null) params.set("limite", String(limite));
    return new EventSource(`${API_BASE}/search/stream?${params}`);
  }

  adaptEvent(ev: SearchEventModel): SearchEventModel {
    if (ev.tipo === "resultado" && ev.dado) {
      return { ...ev, dado: adaptSearchResult(ev.dado) };
    }
    return ev;
  }

  async cancelarParcial(proteinas_query: string, token = ""): Promise<void> {
    try {
      await this.httpClient.delete("/search/cancelar-parcial", {
        token,
        data: { proteinas_query },
      });
    } catch {
      // silently ignore cancellation errors
    }
  }
}
