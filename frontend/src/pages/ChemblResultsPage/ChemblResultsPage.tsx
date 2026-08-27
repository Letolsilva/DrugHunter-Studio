// pages/ChemblResultsPage/ChemblResultsPage.tsx
import type { ChemblUseCase } from "../../data/usecases/chembl.usecase";
import type { AdmetUseCase } from "../../data/usecases/admet.usecase";
import { useChemblResultsPage } from "./useChemblResultsPage";
import ChemblResultsTemplate from "../../templates/chembl/ChemblResultsTemplate";

interface Props {
  chemblUseCase: ChemblUseCase;
  admetUseCase: AdmetUseCase;
}

export default function ChemblResultsPage({ chemblUseCase, admetUseCase }: Props) {
  const pageProps = useChemblResultsPage(chemblUseCase, admetUseCase);
  return <ChemblResultsTemplate {...pageProps} />;
}
