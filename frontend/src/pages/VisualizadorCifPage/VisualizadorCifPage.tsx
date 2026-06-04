// pages/VisualizadorCifPage/VisualizadorCifPage.tsx
import { useVisualizadorPage } from "../VisualizadorPage/useVisualizadorPage";
import VisualizadorTemplate from "../../templates/visualizador/VisualizadorTemplate";
import type { VisualizadorCifUseCase } from "../../data/usecases/visualizador_cif.usecase";

interface VisualizadorCifPageProps {
  visualizadorCifUseCase: VisualizadorCifUseCase;
}

export default function VisualizadorCifPage({
  visualizadorCifUseCase,
}: VisualizadorCifPageProps) {
  const props = useVisualizadorPage(visualizadorCifUseCase);
  return <VisualizadorTemplate {...props} formato="cif" />;
}
