// pages/SearchPage/SearchPage.tsx
import { useSearchPage } from "./useSearchPage";
import SearchTemplate from "../../templates/search/SearchTemplate";
import type { SearchUseCase } from "../../data/usecases/search.usecase";
import type { DashboardUseCase } from "../../data/usecases/dashboard.usecase";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";

interface SearchPageProps {
  searchUseCase: SearchUseCase;
  dashboardUseCase: DashboardUseCase;
  historyUseCase: HistoryUseCase;
}

export default function SearchPage({
  searchUseCase,
  dashboardUseCase,
  historyUseCase,
}: SearchPageProps) {
  const pageProps = useSearchPage(searchUseCase, dashboardUseCase, historyUseCase);
  return <SearchTemplate {...pageProps} />;
}
