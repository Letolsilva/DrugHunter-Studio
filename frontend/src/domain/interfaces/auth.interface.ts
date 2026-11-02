// domain/interfaces/auth.interface.ts
import type { TokensModel, UserModel } from "../models/auth.model";

export abstract class IAuthUseCase {
  abstract login(username: string, password: string): Promise<TokensModel>;
  abstract register(
    email: string,
    username: string,
    password: string,
  ): Promise<void>;
  abstract fetchMe(token: string): Promise<UserModel>;
  abstract refreshToken(refreshToken: string): Promise<TokensModel>;
  abstract forgotPassword(email: string): Promise<{ mensagem: string }>;
  abstract resetPassword(token: string, novaSenha: string): Promise<{ mensagem: string }>;
}
