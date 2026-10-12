// App.tsx
import AppRoutes from "./routes";
import { VisualizadorProvider } from "./contexts/VisualizadorContext";
import { RedockingProvider } from "./contexts/RedockingContext";
import { GlobalAccumulatedPanel } from "./components/visualizador/GlobalAccumulatedPanel";
import { GlobalRedockingIndicator } from "./components/visualizador/GlobalRedockingIndicator";
import {
  searchUseCase,
  historyUseCase,
  dashboardUseCase,
  pdbFilesUseCase,
  visualizadorUseCase,
  visualizadorCifUseCase,
  redockingUseCase,
  configUseCase,
  homeUseCase,
  chemblUseCase,
  admetUseCase,
  consensusUseCase,
  clusteringUseCase,
  neuroDockUseCase,
  molecularDynamicsUseCase,
} from "./container";

export default function App() {
  return (
    <VisualizadorProvider>
      <RedockingProvider redockingUseCase={redockingUseCase}>
        <AppRoutes
          searchUseCase={searchUseCase}
          historyUseCase={historyUseCase}
          dashboardUseCase={dashboardUseCase}
          pdbFilesUseCase={pdbFilesUseCase}
          visualizadorUseCase={visualizadorUseCase}
          visualizadorCifUseCase={visualizadorCifUseCase}
          redockingUseCase={redockingUseCase}
          configUseCase={configUseCase}
          homeUseCase={homeUseCase}
          chemblUseCase={chemblUseCase}
          admetUseCase={admetUseCase}
          consensusUseCase={consensusUseCase}
          clusteringUseCase={clusteringUseCase}
          neuroDockUseCase={neuroDockUseCase}
          molecularDynamicsUseCase={molecularDynamicsUseCase}
        />
        <GlobalAccumulatedPanel />
        <GlobalRedockingIndicator />
      </RedockingProvider>
    </VisualizadorProvider>
  );
}
