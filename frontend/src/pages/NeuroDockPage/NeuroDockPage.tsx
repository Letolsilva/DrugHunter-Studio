// pages/NeuroDockPage/NeuroDockPage.tsx
import { useNeuroDockPage } from "./useNeuroDockPage";
import NeuroDockTemplate from "../../templates/neurodock/NeuroDockTemplate";
import type { NeuroDockUseCase } from "../../data/usecases/neurodock.usecase";

interface NeuroDockPageProps {
  neuroDockUseCase: NeuroDockUseCase;
}

export default function NeuroDockPage({ neuroDockUseCase }: NeuroDockPageProps) {
  const props = useNeuroDockPage(neuroDockUseCase);
  return <NeuroDockTemplate {...props} />;
}
