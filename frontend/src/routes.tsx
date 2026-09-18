// routes.tsx
import { type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage/AuthPage";
import HomePage from "./pages/HomePage/HomePage";
import ChemblPage from "./pages/ChemblPage/ChemblPage";
import ChemblResultsPage from "./pages/ChemblResultsPage/ChemblResultsPage";
import AdmetPage from "./pages/AdmetPage/AdmetPage";
import ConsensusPage from "./pages/ConsensusPage/ConsensusPage";
import ClusteringPage from "./pages/ClusteringPage/ClusteringPage";
import NeuroDockPage from "./pages/NeuroDockPage/NeuroDockPage";
import SearchPage from "./pages/SearchPage/SearchPage";
import HistoryListPage from "./pages/HistoryListPage/HistoryListPage";
import HistoryDashboardPage from "./pages/HistoryDashboardPage/HistoryDashboardPage";
import PdbFilesPage from "./pages/PdbFilesPage/PdbFilesPage";
import VisualizadorPage from "./pages/VisualizadorPage/VisualizadorPage";
import VisualizadorCifPage from "./pages/VisualizadorCifPage/VisualizadorCifPage";
import RedockingPage from "./pages/RedockingPage/RedockingPage";
import ConfigPage from "./pages/ConfigPage/ConfigPage";
import AjudaPage from "./pages/AjudaPage/AjudaPage";
import type { SearchUseCase } from "./data/usecases/search.usecase";
import type { HistoryUseCase } from "./data/usecases/history.usecase";
import type { DashboardUseCase } from "./data/usecases/dashboard.usecase";
import type { PdbFilesUseCase } from "./data/usecases/pdb_files.usecase";
import type { VisualizadorUseCase } from "./data/usecases/visualizador.usecase";
import type { VisualizadorCifUseCase } from "./data/usecases/visualizador_cif.usecase";
import type { RedockingUseCase } from "./data/usecases/redocking.usecase";
import type { ConfigUseCase } from "./data/usecases/config.usecase";
import type { HomeUseCase } from "./data/usecases/home.usecase";
import type { ChemblUseCase } from "./data/usecases/chembl.usecase";
import type { AdmetUseCase } from "./data/usecases/admet.usecase";
import type { ConsensusUseCase } from "./data/usecases/consensus.usecase";
import type { ClusteringUseCase } from "./data/usecases/clustering.usecase";
import type { NeuroDockUseCase } from "./data/usecases/neurodock.usecase";

interface RotaProtegidaProps {
  children: ReactNode;
}

function RotaProtegida({ children }: RotaProtegidaProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface-primary"
      >
        <span
          className="spinner"
          style={{ width: 32, height: 32, borderWidth: 3 }}
        />
        <span
          style={{
            color: "#4a6080",
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontSize: 13,
          }}
        >
          Carregando...
        </span>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/" replace />;
}

interface AppRoutesProps {
  searchUseCase: SearchUseCase;
  historyUseCase: HistoryUseCase;
  dashboardUseCase: DashboardUseCase;
  pdbFilesUseCase: PdbFilesUseCase;
  visualizadorUseCase: VisualizadorUseCase;
  visualizadorCifUseCase: VisualizadorCifUseCase;
  redockingUseCase: RedockingUseCase;
  configUseCase: ConfigUseCase;
  homeUseCase: HomeUseCase;
  chemblUseCase: ChemblUseCase;
  admetUseCase: AdmetUseCase;
  consensusUseCase: ConsensusUseCase;
  clusteringUseCase: ClusteringUseCase;
  neuroDockUseCase: NeuroDockUseCase;
}

export default function AppRoutes({
  searchUseCase,
  historyUseCase,
  dashboardUseCase,
  pdbFilesUseCase,
  visualizadorUseCase,
  visualizadorCifUseCase,
  redockingUseCase,
  configUseCase,
  homeUseCase,
  chemblUseCase,
  admetUseCase,
  consensusUseCase,
  clusteringUseCase,
  neuroDockUseCase,
}: AppRoutesProps) {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          loading ? null : user ? (
            <Navigate to="/home" replace />
          ) : (
            <AuthPage />
          )
        }
      />
      <Route
        path="/home"
        element={
          <RotaProtegida>
            <HomePage homeUseCase={homeUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/chembl"
        element={
          <RotaProtegida>
            <ChemblPage chemblUseCase={chemblUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/chembl/:jobId/resultados"
        element={
          <RotaProtegida>
            <ChemblResultsPage chemblUseCase={chemblUseCase} admetUseCase={admetUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/busca-pdb"
        element={
          <RotaProtegida>
            <SearchPage
              searchUseCase={searchUseCase}
              dashboardUseCase={dashboardUseCase}
              historyUseCase={historyUseCase}
            />
          </RotaProtegida>
        }
      />
      <Route
        path="/historico"
        element={<Navigate to="/busca-pdb" replace />}
      />
      <Route
        path="/historico/:id"
        element={
          <RotaProtegida>
            <HistoryDashboardPage
              historyUseCase={historyUseCase}
              dashboardUseCase={dashboardUseCase}
            />
          </RotaProtegida>
        }
      />
      <Route
        path="/meus-pdbs"
        element={
          <RotaProtegida>
            <PdbFilesPage pdbFilesUseCase={pdbFilesUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/visualizador/:pdb_id"
        element={
          <RotaProtegida>
            <VisualizadorPage visualizadorUseCase={visualizadorUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/visualizador-cif/:pdb_id"
        element={
          <RotaProtegida>
            <VisualizadorCifPage
              visualizadorCifUseCase={visualizadorCifUseCase}
            />
          </RotaProtegida>
        }
      />
      <Route
        path="/redocking"
        element={
          <RotaProtegida>
            <RedockingPage redockingUseCase={redockingUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <RotaProtegida>
            <ConfigPage configUseCase={configUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/ajuda"
        element={
          <RotaProtegida>
            <AjudaPage configUseCase={configUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/admet"
        element={
          <RotaProtegida>
            <AdmetPage admetUseCase={admetUseCase} consensusUseCase={consensusUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/admet/:resultId"
        element={
          <RotaProtegida>
            <AdmetPage admetUseCase={admetUseCase} consensusUseCase={consensusUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/consensus/:jobId"
        element={
          <RotaProtegida>
            <ConsensusPage consensusUseCase={consensusUseCase} admetUseCase={admetUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/consensus"
        element={
          <RotaProtegida>
            <ConsensusPage consensusUseCase={consensusUseCase} admetUseCase={admetUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/clustering/:jobId"
        element={
          <RotaProtegida>
            <ClusteringPage clusteringUseCase={clusteringUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/clustering"
        element={
          <RotaProtegida>
            <ClusteringPage clusteringUseCase={clusteringUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/neurodock/:modelId/prediction/:predId"
        element={
          <RotaProtegida>
            <NeuroDockPage neuroDockUseCase={neuroDockUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/neurodock/:modelId"
        element={
          <RotaProtegida>
            <NeuroDockPage neuroDockUseCase={neuroDockUseCase} />
          </RotaProtegida>
        }
      />
      <Route
        path="/neurodock"
        element={
          <RotaProtegida>
            <NeuroDockPage neuroDockUseCase={neuroDockUseCase} />
          </RotaProtegida>
        }
      />
      <Route path="/predicao" element={<Navigate to="/chembl" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
