// pages/AdmetPage/AdmetPage.tsx
import type { AdmetUseCase } from "../../data/usecases/admet.usecase";
import { useAdmetPage } from "./useAdmetPage";
import AdmetTemplate from "../../templates/admet/AdmetTemplate";

interface Props {
  admetUseCase: AdmetUseCase;
}

export default function AdmetPage({ admetUseCase }: Props) {
  const pageProps = useAdmetPage(admetUseCase);
  return <AdmetTemplate {...pageProps} />;
}
