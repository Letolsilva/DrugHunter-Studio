// App.tsx
import AppRoutes from "./routes";
import { searchUseCase, historyUseCase } from "./container";

export default function App() {
  return (
    <AppRoutes searchUseCase={searchUseCase} historyUseCase={historyUseCase} />
  );
}
