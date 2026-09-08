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
import { ConfigUseCase } from "./data/usecases/config.usecase";
import { HomeUseCase } from "./data/usecases/home.usecase";
import { ChemblUseCase } from "./data/usecases/chembl.usecase";
import { AdmetUseCase } from "./data/usecases/admet.usecase";
import { ConsensusUseCase } from "./data/usecases/consensus.usecase";

const httpClient = new HTTPClient();

export const authUseCase = new AuthUseCase(httpClient);
export const searchUseCase = new SearchUseCase(httpClient);
export const historyUseCase = new HistoryUseCase(httpClient);
export const dashboardUseCase = new DashboardUseCase();
export const pdbFilesUseCase = new PdbFilesUseCase(httpClient);
export const visualizadorUseCase = new VisualizadorUseCase(httpClient);
export const visualizadorCifUseCase = new VisualizadorCifUseCase(httpClient);
export const redockingUseCase = new RedockingUseCase(httpClient);
export const configUseCase = new ConfigUseCase(httpClient);
export const homeUseCase = new HomeUseCase(httpClient);
export const chemblUseCase = new ChemblUseCase(httpClient);
export const admetUseCase = new AdmetUseCase(httpClient);
export const consensusUseCase = new ConsensusUseCase(httpClient);
