// data/usecases/home.usecase.ts
import { IHomeUseCase } from "../../domain/interfaces/home.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { HomeStatusModel } from "../../domain/models/home.model";

export class HomeUseCase extends IHomeUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async getStatus(token: string): Promise<HomeStatusModel> {
    const res = await this.httpClient.get<HomeStatusModel>("/home/status", { token });
    return res.data;
  }
}
