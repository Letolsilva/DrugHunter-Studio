// App.tsx
import AppRoutes from "./routes";
import { VisualizadorProvider } from "./contexts/VisualizadorContext";
import { GlobalAccumulatedPanel } from "./components/visualizador/GlobalAccumulatedPanel";
import {
  searchUseCase,
  historyUseCase,
  dashboardUseCase,
  pdbFilesUseCase,
  visualizadorUseCase,
  visualizadorCifUseCase,
} from "./container";

export default function App() {
  return (
    <VisualizadorProvider>
      <AppRoutes
        searchUseCase={searchUseCase}
        historyUseCase={historyUseCase}
        dashboardUseCase={dashboardUseCase}
        pdbFilesUseCase={pdbFilesUseCase}
        visualizadorUseCase={visualizadorUseCase}
        visualizadorCifUseCase={visualizadorCifUseCase}
      />
      <GlobalAccumulatedPanel />
    </VisualizadorProvider>
  );
}
