// infra/http/httpClient.ts
import {
  IHTTPClient,
  type HttpConfig,
  type HttpResponse,
} from "../interfaces/httpClient.interface";

export class HTTPClient extends IHTTPClient {
  private baseURL: string;

  constructor(baseURL = "/api") {
    super();
    this.baseURL = baseURL;
  }

  private _buildHeaders(
    token?: string,
    formEncoded = false,
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    headers["Content-Type"] = formEncoded
      ? "application/x-www-form-urlencoded"
      : "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  }

  private async _handleResponse<T>(res: Response): Promise<HttpResponse<T>> {
    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new Error(
        (data as { detail?: string }).detail ?? `Erro ${res.status}`,
      );
    }
    return { data: data as T, status: res.status };
  }

  async get<T = unknown>(
    url: string,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseURL}${url}`, {
      method: "GET",
      headers: this._buildHeaders(config.token),
    });
    return this._handleResponse<T>(res);
  }

  async post<T = unknown>(
    url: string,
    data: unknown,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    const { token, formEncoded = false } = config;
    const res = await fetch(`${this.baseURL}${url}`, {
      method: "POST",
      headers: this._buildHeaders(token, formEncoded),
      body: formEncoded
        ? data instanceof URLSearchParams
          ? data.toString()
          : String(data)
        : JSON.stringify(data),
    });
    return this._handleResponse<T>(res);
  }

  async put<T = unknown>(
    url: string,
    data: unknown,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseURL}${url}`, {
      method: "PUT",
      headers: this._buildHeaders(config.token),
      body: JSON.stringify(data),
    });
    return this._handleResponse<T>(res);
  }

  async patch<T = unknown>(
    url: string,
    data: unknown,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseURL}${url}`, {
      method: "PATCH",
      headers: this._buildHeaders(config.token),
      body: JSON.stringify(data),
    });
    return this._handleResponse<T>(res);
  }

  async delete<T = unknown>(
    url: string,
    config: HttpConfig = {},
  ): Promise<HttpResponse<T>> {
    const res = await fetch(`${this.baseURL}${url}`, {
      method: "DELETE",
      headers: this._buildHeaders(config.token),
      body: config.data ? JSON.stringify(config.data) : undefined,
    });
    return this._handleResponse<T>(res);
  }
}
