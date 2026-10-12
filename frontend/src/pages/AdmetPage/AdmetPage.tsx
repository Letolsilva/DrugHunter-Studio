// pages/AdmetPage/AdmetPage.tsx
import type { AdmetUseCase } from "../../data/usecases/admet.usecase";
import type { ConsensusUseCase } from "../../data/usecases/consensus.usecase";
import { useAdmetPage } from "./useAdmetPage";
import AdmetTemplate from "../../templates/admet/AdmetTemplate";

interface Props {
  admetUseCase: AdmetUseCase;
  consensusUseCase: ConsensusUseCase;
}

export default function AdmetPage({ admetUseCase, consensusUseCase }: Props) {
  const pageProps = useAdmetPage(admetUseCase, consensusUseCase);
  return <AdmetTemplate {...pageProps} />;
}
