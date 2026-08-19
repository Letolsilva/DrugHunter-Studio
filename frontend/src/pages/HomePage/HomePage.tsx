// pages/HomePage/HomePage.tsx
import type { HomeUseCase } from "../../data/usecases/home.usecase";
import { useHomePage } from "./useHomePage";
import HomeTemplate from "../../templates/home/HomeTemplate";

interface HomePageProps {
  homeUseCase: HomeUseCase;
}

export default function HomePage({ homeUseCase }: HomePageProps) {
  const props = useHomePage(homeUseCase);
  return <HomeTemplate {...props} />;
}
