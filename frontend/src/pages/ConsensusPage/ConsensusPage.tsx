// pages/ConsensusPage/ConsensusPage.tsx
import type { ConsensusUseCase } from "../../data/usecases/consensus.usecase";
import type { AdmetUseCase } from "../../data/usecases/admet.usecase";
import { useConsensusPage } from "./useConsensusPage";
import ConsensusTemplate from "../../templates/consensus/ConsensusTemplate";

interface Props {
  consensusUseCase: ConsensusUseCase;
  admetUseCase: AdmetUseCase;
}

export default function ConsensusPage({ consensusUseCase, admetUseCase }: Props) {
  const pageProps = useConsensusPage(consensusUseCase, admetUseCase);
  return <ConsensusTemplate {...pageProps} />;
}
