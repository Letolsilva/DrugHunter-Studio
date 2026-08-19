// pages/ChemblPage/ChemblPage.tsx
import type { ChemblUseCase } from "../../data/usecases/chembl.usecase";
import { useChemblPage } from "./useChemblPage";
import ChemblTemplate from "../../templates/chembl/ChemblTemplate";

interface ChemblPageProps {
  chemblUseCase: ChemblUseCase;
}

export default function ChemblPage({ chemblUseCase }: ChemblPageProps) {
  const props = useChemblPage(chemblUseCase);
  return <ChemblTemplate {...props} />;
}
