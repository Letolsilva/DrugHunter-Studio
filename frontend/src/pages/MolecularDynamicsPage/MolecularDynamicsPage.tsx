// pages/MolecularDynamicsPage/MolecularDynamicsPage.tsx
import { useMolecularDynamicsPage } from "./useMolecularDynamicsPage";
import MolecularDynamicsTemplate from "../../templates/molecular_dynamics/MolecularDynamicsTemplate";
import type { MolecularDynamicsUseCase } from "../../data/usecases/molecular_dynamics.usecase";

interface MolecularDynamicsPageProps {
  molecularDynamicsUseCase: MolecularDynamicsUseCase;
}

export default function MolecularDynamicsPage({ molecularDynamicsUseCase }: MolecularDynamicsPageProps) {
  const props = useMolecularDynamicsPage(molecularDynamicsUseCase);
  return <MolecularDynamicsTemplate {...props} />;
}
