// pages/HistoryDashboardPage/HistoryDashboardPage.tsx
import { useHistoryDashboardPage } from "./useHistoryDashboardPage";
import HistoryDashboardTemplate from "../../templates/history/HistoryDashboardTemplate";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";

interface HistoryDashboardPageProps {
  historyUseCase: HistoryUseCase;
}

export default function HistoryDashboardPage({
  historyUseCase,
}: HistoryDashboardPageProps) {
  const props = useHistoryDashboardPage(historyUseCase);
  return <HistoryDashboardTemplate {...props} />;
}
