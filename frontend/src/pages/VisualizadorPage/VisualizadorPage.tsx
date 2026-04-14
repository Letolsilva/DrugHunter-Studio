// pages/VisualizadorPage/VisualizadorPage.tsx
import { useVisualizadorPage } from "./useVisualizadorPage";
import VisualizadorTemplate from "../../templates/visualizador/VisualizadorTemplate";
import type { VisualizadorUseCase } from "../../data/usecases/visualizador.usecase";

interface VisualizadorPageProps {
  visualizadorUseCase: VisualizadorUseCase;
}

export default function VisualizadorPage({
  visualizadorUseCase,
}: VisualizadorPageProps) {
  const props = useVisualizadorPage(visualizadorUseCase);
  return <VisualizadorTemplate {...props} formato="legacy" />;
}
