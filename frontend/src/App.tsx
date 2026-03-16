// App.tsx
import AppRoutes from "./routes";
import { searchUseCase } from "./container";

export default function App() {
  return <AppRoutes searchUseCase={searchUseCase} />;
}
