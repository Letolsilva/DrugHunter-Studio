// pages/HistoryListPage/HistoryListPage.tsx
import { useHistoryListPage } from "./useHistoryListPage";
import HistoryListTemplate from "../../templates/history/HistoryListTemplate";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";

interface HistoryListPageProps {
  historyUseCase: HistoryUseCase;
}

export default function HistoryListPage({
  historyUseCase,
}: HistoryListPageProps) {
  const props = useHistoryListPage(historyUseCase);
  return <HistoryListTemplate {...props} />;
}
