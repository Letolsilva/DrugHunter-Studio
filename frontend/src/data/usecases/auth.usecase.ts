// data/usecases/auth.usecase.ts
import { IAuthUseCase } from "../../domain/interfaces/auth.interface";
import type { IHTTPClient } from "../../infra/interfaces/httpClient.interface";
import type { TokensModel, UserModel } from "../../domain/models/auth.model";

export class AuthUseCase extends IAuthUseCase {
  private httpClient: IHTTPClient;

  constructor(httpClient: IHTTPClient) {
    super();
    this.httpClient = httpClient;
  }

  async login(username: string, password: string): Promise<TokensModel> {
    const body = new URLSearchParams({ username, password });
    return this.httpClient
      .post<TokensModel>("/auth/login", body, { formEncoded: true })
      .then((res) => res.data);
  }

  async register(
    email: string,
    username: string,
    password: string,
  ): Promise<void> {
    await this.httpClient.post("/auth/register", { email, username, password });
  }

  async fetchMe(token: string): Promise<UserModel> {
    return this.httpClient
      .get<UserModel>("/auth/me", { token })
      .then((res) => res.data);
  }

  async refreshToken(refreshToken: string): Promise<TokensModel> {
    return this.httpClient
      .post<TokensModel>("/auth/refresh", { refresh_token: refreshToken })
      .then((res) => res.data);
  }
}
