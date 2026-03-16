// pages/SearchPage/SearchPage.tsx
import { useSearchPage } from "./useSearchPage";
import SearchTemplate from "../../templates/search/SearchTemplate";
import type { SearchUseCase } from "../../data/usecases/search.usecase";

interface SearchPageProps {
  searchUseCase: SearchUseCase;
}

export default function SearchPage({ searchUseCase }: SearchPageProps) {
  const props = useSearchPage(searchUseCase);
  return <SearchTemplate {...props} />;
}
