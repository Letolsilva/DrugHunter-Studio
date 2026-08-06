// data/usecases/config.usecase.ts
import { IConfigUseCase } from "../../domain/interfaces/config.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { ConfigsModel, UsuariosModel } from "../../domain/models/config.model";

export class ConfigUseCase extends IConfigUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async getConfigs(token: string): Promise<ConfigsModel> {
    const res = await this.httpClient.get<ConfigsModel>("/admin/config", { token });
    return res.data;
  }

  async setConfig(chave: string, valor: string, token: string): Promise<void> {
    await this.httpClient.put(
      `/admin/config/${chave}`,
      { valor: String(valor) },
      { token },
    );
  }

  async limparCache(token: string): Promise<{ removidas: number }> {
    const res = await this.httpClient.post<{ removidas: number }>(
      "/admin/cache/limpar",
      {},
      { token },
    );
    return res.data;
  }

  async listarUsuarios(token: string): Promise<UsuariosModel> {
    const res = await this.httpClient.get<UsuariosModel>("/admin/users", { token });
    return res.data;
  }

  async setAdmin(usuarioId: number, isAdmin: boolean, token: string): Promise<void> {
    await this.httpClient.patch(
      `/admin/users/${usuarioId}`,
      { is_admin: isAdmin },
      { token },
    );
  }

  async validarDrugHunter(token: string): Promise<ValidacaoDHResponse> {
    const res = await this.httpClient.get<ValidacaoDHResponse>("/admin/validar-drughunter", { token });
    return res.data;
  }
}

export interface CheckItemDH {
  nome: string;
  ok: boolean;
  mensagem: string;
  como_corrigir: string | null;
}

export interface ValidacaoDHResponse {
  checks: CheckItemDH[];
}
