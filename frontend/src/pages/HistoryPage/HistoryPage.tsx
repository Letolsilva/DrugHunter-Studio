// pages/HistoryPage/HistoryPage.tsx
import { useHistoryPage } from "./useHistoryPage";
import HistoryTemplate from "../../templates/history/HistoryTemplate";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";

interface HistoryPageProps {
  historyUseCase: HistoryUseCase;
}

export default function HistoryPage({ historyUseCase }: HistoryPageProps) {
  const props = useHistoryPage(historyUseCase);
  return <HistoryTemplate {...props} />;
}
