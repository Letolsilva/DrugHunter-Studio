// App.tsx
import AppRoutes from "./routes";
import { searchUseCase, historyUseCase, dashboardUseCase } from "./container";

export default function App() {
  return (
    <AppRoutes
      searchUseCase={searchUseCase}
      historyUseCase={historyUseCase}
      dashboardUseCase={dashboardUseCase}
    />
  );
}
