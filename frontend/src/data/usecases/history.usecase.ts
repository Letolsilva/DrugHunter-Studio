// data/usecases/history.usecase.ts
import { IHistoryUseCase } from "../../domain/interfaces/history.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type {
  SearchHistoryItem,
  SearchHistoryDetail,
  SearchHistoryItemRaw,
  SearchHistoryDetailRaw,
} from "../../domain/models/history.model";
import {
  adaptHistoryItem,
  adaptHistoryDetail,
} from "../adapters/history.adapter";

export class HistoryUseCase extends IHistoryUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async getHistory(token: string): Promise<SearchHistoryItem[]> {
    const res = await this.httpClient.get<{
      historico: SearchHistoryItemRaw[];
    }>("/auth/me/historico", { token });
    return res.data.historico.map(adaptHistoryItem);
  }

  async getDetail(id: number, token: string): Promise<SearchHistoryDetail> {
    const res = await this.httpClient.get<SearchHistoryDetailRaw>(
      `/auth/me/historico/${id}`,
      { token },
    );
    return adaptHistoryDetail(res.data);
  }
}
