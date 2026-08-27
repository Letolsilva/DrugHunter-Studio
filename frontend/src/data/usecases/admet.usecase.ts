// data/usecases/admet.usecase.ts
import { IAdmetUseCase } from "../../domain/interfaces/admet.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { AdmetMoleculesResponse, AdmetResultModel } from "../../domain/models/admet.model";
import { HttpError } from "../../infra/http/httpClient";

export class AdmetUseCase extends IAdmetUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async run(itemId: number, token: string): Promise<AdmetResultModel> {
    const res = await this.httpClient.post<AdmetResultModel>(
      "/admet/run",
      { chembl_job_item_id: itemId },
      { token },
    );
    return res.data;
  }

  async getResult(resultId: number, token: string): Promise<AdmetResultModel> {
    const res = await this.httpClient.get<AdmetResultModel>(
      `/admet/results/${resultId}`,
      { token },
    );
    return res.data;
  }

  async getByItem(itemId: number, token: string): Promise<AdmetResultModel | null> {
    try {
      const res = await this.httpClient.get<AdmetResultModel>(
        `/admet/results/by-item/${itemId}`,
        { token },
      );
      return res.data;
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  async listMolecules(
    resultId: number,
    token: string,
    page = 1,
    perPage = 50,
    bbb?: string,
    hia?: string,
  ): Promise<AdmetMoleculesResponse> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (bbb) params.set("bbb", bbb);
    if (hia) params.set("hia", hia);
    const res = await this.httpClient.get<AdmetMoleculesResponse>(
      `/admet/results/${resultId}/molecules?${params}`,
      { token },
    );
    return res.data;
  }

  downloadUrl(resultId: number, tipo: string, _token: string): string {
    return `/api/admet/results/${resultId}/download/${tipo}`;
  }
}
