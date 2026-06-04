// infra/interfaces/httpClient.interface.ts

export interface HttpConfig {
  token?: string;
  formEncoded?: boolean;
  data?: unknown;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
}

export abstract class IHTTPClient {
  abstract get<T = unknown>(
    url: string,
    config?: HttpConfig,
  ): Promise<HttpResponse<T>>;
  abstract post<T = unknown>(
    url: string,
    data: unknown,
    config?: HttpConfig,
  ): Promise<HttpResponse<T>>;
  abstract put<T = unknown>(
    url: string,
    data: unknown,
    config?: HttpConfig,
  ): Promise<HttpResponse<T>>;
  abstract patch<T = unknown>(
    url: string,
    data: unknown,
    config?: HttpConfig,
  ): Promise<HttpResponse<T>>;
  abstract delete<T = unknown>(
    url: string,
    config?: HttpConfig,
  ): Promise<HttpResponse<T>>;
}
