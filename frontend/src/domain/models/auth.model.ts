// domain/models/auth.model.ts

export interface TokensModel {
  access_token: string;
  refresh_token?: string;
}

export interface UserModel {
  username: string;
  email: string;
  is_admin: boolean;
}

export interface RegisterPayloadModel {
  email: string;
  username: string;
  password: string;
}
