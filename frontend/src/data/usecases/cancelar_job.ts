// data/usecases/cancelar_job.ts
// Cancelamento de jobs — endpoint único do backend: POST /api/jobs/{kind}/{id}/cancel
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";

export type JobKind =
  | "redocking"
  | "chembl"
  | "admet"
  | "clustering"
  | "consensus"
  | "neurodock-model"
  | "neurodock-prediction"
  | "md"
  | "md-analysis";

export async function cancelarJob(
  httpClient: IHTTPClient,
  kind: JobKind,
  id: number,
  token: string,
): Promise<void> {
  await httpClient.post(`/jobs/${kind}/${id}/cancel`, {}, { token });
}
