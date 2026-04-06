// pages/VisualizadorCifPage/VisualizadorCifPage.tsx
import { useVisualizadorPage } from "../VisualizadorPage/useVisualizadorPage";
import VisualizadorCifTemplate from "../../templates/visualizador/VisualizadorCifTemplate";
import type { VisualizadorCifUseCase } from "../../data/usecases/visualizador_cif.usecase";

interface VisualizadorCifPageProps {
  visualizadorCifUseCase: VisualizadorCifUseCase;
}

export default function VisualizadorCifPage({
  visualizadorCifUseCase,
}: VisualizadorCifPageProps) {
  const props = useVisualizadorPage(visualizadorCifUseCase);
  return <VisualizadorCifTemplate {...props} />;
}
