// domain/interfaces/redocking.interface.ts
import type {
  IniciarRedockingPayload,
  ProntidaoResponse,
  RedockingJobModel,
} from "../models/redocking.model";

export abstract class IRedockingUseCase {
  abstract iniciar(
    payload: IniciarRedockingPayload,
    token: string,
  ): Promise<RedockingJobModel>;
  abstract listarJobs(token: string): Promise<RedockingJobModel[]>;
  abstract statusJob(jobId: number, token: string): Promise<RedockingJobModel>;
  abstract salvarCsv(
    csvContent: string,
    token: string,
    target?: string,
    baseInputPath?: string,
  ): Promise<void>;
  abstract buscarCsv(token: string): Promise<string | null>;
  abstract buscarDefaults(
    token: string,
  ): Promise<{
    base_input_path: string;
    base_output_path: string;
    charge_type: "am1" | "gas";
    last_target: string | null;
  }>;
  abstract deletarJob(jobId: number, token: string): Promise<void>;
  abstract verificarProntidao(
    target: string,
    baseInputPath: string,
    token: string,
  ): Promise<ProntidaoResponse>;
  abstract preparar(
    target: string,
    baseInputPath: string,
    token: string,
  ): Promise<ProntidaoResponse>;
}
