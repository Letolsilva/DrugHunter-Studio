// domain/interfaces/history.interface.ts
import type {
  SearchHistoryItem,
  SearchHistoryDetail,
} from "../models/history.model";

export abstract class IHistoryUseCase {
  abstract getHistory(token: string): Promise<SearchHistoryItem[]>;
  abstract getDetail(id: number, token: string): Promise<SearchHistoryDetail>;
  abstract deleteItem(id: number, token: string): Promise<void>;
}
