// data/usecases/redocking.usecase.ts
import { IRedockingUseCase } from "../../domain/interfaces/redocking.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import { cancelarJob } from "./cancelar_job";
import type {
  IniciarRedockingPayload,
  ProntidaoResponse,
  RedockingJobModel,
} from "../../domain/models/redocking.model";

interface JobsListResponse {
  jobs: RedockingJobModel[];
}

export class RedockingUseCase extends IRedockingUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async iniciar(
    payload: IniciarRedockingPayload,
    token: string,
  ): Promise<RedockingJobModel> {
    return this.httpClient
      .post<RedockingJobModel>("/redocking/iniciar", payload, { token })
      .then((res) => res.data);
  }

  async listarJobs(token: string): Promise<RedockingJobModel[]> {
    return this.httpClient
      .get<JobsListResponse>("/redocking/jobs", { token })
      .then((res) => res.data.jobs);
  }

  async statusJob(jobId: number, token: string): Promise<RedockingJobModel> {
    return this.httpClient
      .get<RedockingJobModel>(`/redocking/jobs/status/${jobId}`, { token })
      .then((res) => res.data);
  }

  async salvarCsv(
    csvContent: string,
    token: string,
    target = "",
    baseInputPath = "",
  ): Promise<void> {
    await this.httpClient.put(
      "/redocking/csv",
      { csv_content: csvContent, target, base_input_path: baseInputPath },
      { token },
    );
  }

  async deletarJob(jobId: number, token: string): Promise<void> {
    await this.httpClient.delete(`/redocking/jobs/${jobId}`, { token });
  }

  async cancelar(id: number, token: string): Promise<void> {
    await cancelarJob(this.httpClient, "redocking", id, token);
  }

  async buscarCsv(token: string): Promise<string | null> {
    try {
      const res = await this.httpClient.get<{ csv_content: string }>(
        "/redocking/csv",
        { token },
      );
      return res.data.csv_content;
    } catch {
      return null; // 404 = nenhum CSV salvo ainda
    }
  }

  async buscarDefaults(
    token: string,
  ): Promise<{
    base_input_path: string;
    base_output_path: string;
    charge_type: "am1" | "gas";
    last_target: string | null;
  }> {
    return this.httpClient
      .get<{
        base_input_path: string;
        base_output_path: string;
        charge_type: "am1" | "gas";
        last_target: string | null;
      }>("/redocking/defaults", { token })
      .then((res) => res.data);
  }

  async verificarProntidao(
    target: string,
    baseInputPath: string,
    token: string,
  ): Promise<ProntidaoResponse> {
    const params = new URLSearchParams({ target, base_input_path: baseInputPath });
    return this.httpClient
      .get<ProntidaoResponse>(`/redocking/prontidao?${params}`, { token })
      .then((res) => res.data);
  }

  async preparar(
    target: string,
    baseInputPath: string,
    token: string,
  ): Promise<ProntidaoResponse> {
    return this.httpClient
      .post<ProntidaoResponse>(
        "/redocking/preparar",
        { target, base_input_path: baseInputPath },
        { token },
      )
      .then((res) => res.data);
  }
}
