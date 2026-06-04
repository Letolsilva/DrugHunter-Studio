// pages/PdbFilesPage/PdbFilesPage.tsx
import { usePdbFilesPage } from "./usePdbFilesPage";
import PdbFilesTemplate from "../../templates/pdb_files/PdbFilesTemplate";
import type { PdbFilesUseCase } from "../../data/usecases/pdb_files.usecase";

interface PdbFilesPageProps {
  pdbFilesUseCase: PdbFilesUseCase;
}

export default function PdbFilesPage({ pdbFilesUseCase }: PdbFilesPageProps) {
  const props = usePdbFilesPage(pdbFilesUseCase);
  return <PdbFilesTemplate {...props} />;
}
