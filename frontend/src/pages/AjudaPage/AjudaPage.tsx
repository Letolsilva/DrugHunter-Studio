// pages/AjudaPage/AjudaPage.tsx
import AjudaTemplate from "../../templates/ajuda/AjudaTemplate";
import { useAjudaPage } from "./useAjudaPage";
import type { ConfigUseCase } from "../../data/usecases/config.usecase";

interface AjudaPageProps {
  configUseCase: ConfigUseCase;
}

export default function AjudaPage({ configUseCase }: AjudaPageProps) {
  const props = useAjudaPage(configUseCase);
  return <AjudaTemplate {...props} />;
}
