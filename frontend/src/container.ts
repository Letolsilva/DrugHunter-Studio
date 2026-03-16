// container.ts
// Ponto central de composição da aplicação.
// Instancia a infraestrutura e os usecases — sem lógica de negócio.
import { HTTPClient } from "./infra/http/httpClient";
import { AuthUseCase } from "./data/usecases/auth.usecase";
import { SearchUseCase } from "./data/usecases/search.usecase";
import { HistoryUseCase } from "./data/usecases/history.usecase";

const httpClient = new HTTPClient();

export const authUseCase = new AuthUseCase(httpClient);
export const searchUseCase = new SearchUseCase(httpClient);
export const historyUseCase = new HistoryUseCase(httpClient);
