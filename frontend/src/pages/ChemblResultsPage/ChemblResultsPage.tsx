// pages/ChemblResultsPage/ChemblResultsPage.tsx
import type { ChemblUseCase } from "../../data/usecases/chembl.usecase";
import { useChemblResultsPage } from "./useChemblResultsPage";
import ChemblResultsTemplate from "../../templates/chembl/ChemblResultsTemplate";

interface Props {
  chemblUseCase: ChemblUseCase;
}

export default function ChemblResultsPage({ chemblUseCase }: Props) {
  const pageProps = useChemblResultsPage(chemblUseCase);
  return <ChemblResultsTemplate {...pageProps} />;
}
