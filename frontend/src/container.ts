// container.ts
// Ponto central de composição da aplicação.
// Instancia a infraestrutura e os usecases — sem lógica de negócio.
import { HTTPClient } from "./infra/http/httpClient";
import { AuthUseCase } from "./data/usecases/auth.usecase";
import { SearchUseCase } from "./data/usecases/search.usecase";
import { HistoryUseCase } from "./data/usecases/history.usecase";
import { DashboardUseCase } from "./data/usecases/dashboard.usecase";
import { PdbFilesUseCase } from "./data/usecases/pdb_files.usecase";
import { VisualizadorUseCase } from "./data/usecases/visualizador.usecase";
import { VisualizadorCifUseCase } from "./data/usecases/visualizador_cif.usecase";
import { RedockingUseCase } from "./data/usecases/redocking.usecase";

const httpClient = new HTTPClient();

export const authUseCase = new AuthUseCase(httpClient);
export const searchUseCase = new SearchUseCase(httpClient);
export const historyUseCase = new HistoryUseCase(httpClient);
export const dashboardUseCase = new DashboardUseCase();
export const pdbFilesUseCase = new PdbFilesUseCase(httpClient);
export const visualizadorUseCase = new VisualizadorUseCase(httpClient);
export const visualizadorCifUseCase = new VisualizadorCifUseCase(httpClient);
export const redockingUseCase = new RedockingUseCase(httpClient);
