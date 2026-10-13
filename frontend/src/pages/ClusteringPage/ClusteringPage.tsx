// pages/ClusteringPage/ClusteringPage.tsx
import ClusteringTemplate from "../../templates/clustering/ClusteringTemplate";
import { useClusteringPage } from "./useClusteringPage";
import type { ClusteringUseCase } from "../../data/usecases/clustering.usecase";

interface Props {
  clusteringUseCase: ClusteringUseCase;
}

export default function ClusteringPage({ clusteringUseCase }: Props) {
  const props = useClusteringPage(clusteringUseCase);
  return <ClusteringTemplate {...props} />;
}
