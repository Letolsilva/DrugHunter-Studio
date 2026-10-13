// pages/ConfigPage/ConfigPage.tsx
import ConfigTemplate from "../../templates/config/ConfigTemplate";
import { useConfigPage } from "./useConfigPage";
import type { ConfigUseCase } from "../../data/usecases/config.usecase";

interface ConfigPageProps {
  configUseCase: ConfigUseCase;
}

export default function ConfigPage({ configUseCase }: ConfigPageProps) {
  const props = useConfigPage(configUseCase);
  return <ConfigTemplate {...props} />;
}
