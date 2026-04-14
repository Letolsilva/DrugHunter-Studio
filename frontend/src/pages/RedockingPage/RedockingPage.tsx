// pages/RedockingPage/RedockingPage.tsx
import type { RedockingUseCase } from "../../data/usecases/redocking.usecase";
import { useRedockingPage } from "./useRedockingPage";
import RedockingTemplate from "../../templates/redocking/RedockingTemplate";

interface RedockingPageProps {
  redockingUseCase: RedockingUseCase;
}

export default function RedockingPage({
  redockingUseCase,
}: RedockingPageProps) {
  const props = useRedockingPage(redockingUseCase);
  return <RedockingTemplate {...props} />;
}
