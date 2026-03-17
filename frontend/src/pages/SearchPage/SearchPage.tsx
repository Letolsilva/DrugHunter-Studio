// pages/SearchPage/SearchPage.tsx
import { useSearchPage } from "./useSearchPage";
import SearchTemplate from "../../templates/search/SearchTemplate";
import type { SearchUseCase } from "../../data/usecases/search.usecase";
import type { DashboardUseCase } from "../../data/usecases/dashboard.usecase";

interface SearchPageProps {
  searchUseCase: SearchUseCase;
  dashboardUseCase: DashboardUseCase;
}

export default function SearchPage({
  searchUseCase,
  dashboardUseCase,
}: SearchPageProps) {
  const props = useSearchPage(searchUseCase, dashboardUseCase);
  return <SearchTemplate {...props} />;
}
