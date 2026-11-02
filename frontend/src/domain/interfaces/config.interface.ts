// domain/interfaces/config.interface.ts
import type { ConfigsModel, UsuariosModel } from "../models/config.model";

export abstract class IConfigUseCase {
  abstract getConfigs(token: string): Promise<ConfigsModel>;
  abstract setConfig(chave: string, valor: string, token: string): Promise<void>;
  abstract limparCache(token: string): Promise<{ removidas: number }>;
  abstract listarUsuarios(token: string): Promise<UsuariosModel>;
  abstract setAdmin(usuarioId: number, isAdmin: boolean, token: string): Promise<void>;
  abstract resetarBanco(token: string): Promise<{ mensagem: string; removidos: Record<string, number> }>;
}
