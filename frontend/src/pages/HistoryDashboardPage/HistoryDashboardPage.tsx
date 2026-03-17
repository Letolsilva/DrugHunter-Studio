// pages/HistoryDashboardPage/HistoryDashboardPage.tsx
import { useHistoryDashboardPage } from "./useHistoryDashboardPage";
import HistoryDashboardTemplate from "../../templates/history/HistoryDashboardTemplate";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";
import type { DashboardUseCase } from "../../data/usecases/dashboard.usecase";

interface HistoryDashboardPageProps {
  historyUseCase: HistoryUseCase;
  dashboardUseCase: DashboardUseCase;
}

export default function HistoryDashboardPage({
  historyUseCase,
  dashboardUseCase,
}: HistoryDashboardPageProps) {
  const props = useHistoryDashboardPage(historyUseCase, dashboardUseCase);
  return <HistoryDashboardTemplate {...props} />;
}
