// pages/ChemblResultsPage/useChemblResultsPage.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { ChemblUseCase } from "../../data/usecases/chembl.usecase";
import type {
  ChemblJobModel,
  ChemblMoleculeModel,
  NetworkInfo,
} from "../../domain/models/chembl.model";

export interface AnalysisStatus {
  has_analysis: boolean;
  analysis_running: boolean;
  centroids_count: number;
  similarity_files: string[];
  mcc_ids: string[];
  mcc_sims_ids: string[];
  mcc_mols_ids: string[];
}

export interface ChemblSummary {
  total: number;
  comPchembl: number;
  pchemblMedio: string;
  ativos: number;
  tiposUnicos: number;
}

export interface UseChemblResultsPageReturn {
  job: ChemblJobModel | null;
  jobLoading: boolean;

  allMolecules: ChemblMoleculeModel[];
  filteredMolecules: ChemblMoleculeModel[];
  displayedMolecules: ChemblMoleculeModel[];
  molLoading: boolean;
  molPage: number;
  molTotalPages: number;
  onMolPageChange: (page: number) => void;

  summary: ChemblSummary | null;
  uniqueTypes: string[];

  minPchembl: number;
  setMinPchembl: (v: number) => void;
  selectedTypes: string[];
  setSelectedTypes: (v: string[]) => void;
  toggleType: (t: string) => void;
  sortDesc: boolean;
  setSortDesc: (v: boolean) => void;
  mccFilter: "all" | "sims" | "mols" | "both";
  setMccFilter: (v: "all" | "sims" | "mols" | "both") => void;

  analysisStatus: AnalysisStatus | null;
  analysisStatusLoading: boolean;
  mccSet: Set<string>;
  mccSimsSet: Set<string>;
  mccMolsSet: Set<string>;
  analysisLoading: boolean;
  analysisSubmitted: boolean;
  fingerprint: "morgan" | "maccs" | "pharmacophore";
  metric: "Tanimoto" | "Dice" | "Cosine";
  onFingerprintChange: (v: "morgan" | "maccs" | "pharmacophore") => void;
  onMetricChange: (v: "Tanimoto" | "Dice" | "Cosine") => void;
  onRunAnalysis: () => void;

  networks: NetworkInfo[];
  networksLoading: boolean;
  selectedNetwork: NetworkInfo | null;
  onOpenNetwork: (net: NetworkInfo) => void;
  onCloseNetwork: () => void;
  getPlotUrl: (filename: string) => string;

  selectedMol: ChemblMoleculeModel | null;
  onSelectMol: (mol: ChemblMoleculeModel) => void;
  onCloseMol: () => void;

  handleLogout: () => void;
  voltarChembl: () => void;
}

const PER_PAGE = 50;

export function useChemblResultsPage(
  chemblUseCase: ChemblUseCase,
): UseChemblResultsPageReturn {
  const { jobId } = useParams<{ jobId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const jobIdNum = Number(jobId);
  const token = () => localStorage.getItem("access_token") ?? "";

  // ── Job ───────────────────────────────────────────────────────────────────
  const [job, setJob] = useState<ChemblJobModel | null>(
    (location.state as { job?: ChemblJobModel } | null)?.job ?? null,
  );
  const [jobLoading, setJobLoading] = useState(!job);

  useEffect(() => {
    if (job) return;
    setJobLoading(true);
    chemblUseCase
      .getJob(jobIdNum, token())
      .then(setJob)
      .catch(() => {})
      .finally(() => setJobLoading(false));
  }, [jobIdNum]);

  // ── Polling enquanto job está rodando ─────────────────────────────────────
  useEffect(() => {
    if (!job || job.status !== "running") return;
    const interval = setInterval(async () => {
      try {
        const refreshed = await chemblUseCase.getJob(jobIdNum, token());
        setJob(refreshed);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [job?.status, jobIdNum, chemblUseCase]);

  // ── Moléculas (todas de uma vez para filtro client-side) ──────────────────
  const [allMolecules, setAllMolecules] = useState<ChemblMoleculeModel[]>([]);
  const [molLoading, setMolLoading] = useState(false);
  const [molPage, setMolPage] = useState(1);

  const [minPchembl, setMinPchembl] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortDesc, setSortDesc] = useState(true);
  const [mccFilter, setMccFilter] = useState<"all" | "sims" | "mols" | "both">("all");

  const loadMolecules = useCallback(() => {
    setMolLoading(true);
    chemblUseCase
      .listarMoleculas(jobIdNum, token(), 1, 99999)
      .then((res) => setAllMolecules(res.molecules))
      .catch(() => {})
      .finally(() => setMolLoading(false));
  }, [jobIdNum, chemblUseCase]);

  // Carrega moléculas quando o job termina (done ou error) ou ao abrir um job já terminado
  useEffect(() => {
    if (job?.status === "done" || job?.status === "error") {
      loadMolecules();
    }
  }, [job?.status, loadMolecules]);

  const uniqueTypes = useMemo(() => {
    const s = new Set<string>();
    allMolecules.forEach((m) => { if (m.type) s.add(m.type); });
    return Array.from(s).sort();
  }, [allMolecules]);

  const summary = useMemo((): ChemblSummary | null => {
    if (allMolecules.length === 0) return null;
    const withP = allMolecules.filter((m) => m.pchembl_value != null);
    const vals = withP.map((m) => m.pchembl_value as number);
    const avg = vals.length > 0
      ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
      : "—";
    return {
      total: allMolecules.length,
      comPchembl: withP.length,
      pchemblMedio: avg,
      ativos: vals.filter((v) => v >= 6).length,
      tiposUnicos: uniqueTypes.length,
    };
  }, [allMolecules, uniqueTypes]);

  // ── Status da análise (declarado antes de filteredMolecules para os mcc sets) ─
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
  const [analysisStatusLoading, setAnalysisStatusLoading] = useState(true);

  const mccSet = useMemo(
    () => new Set<string>(analysisStatus?.mcc_ids ?? []),
    [analysisStatus],
  );
  const mccSimsSet = useMemo(
    () => new Set<string>(analysisStatus?.mcc_sims_ids ?? []),
    [analysisStatus],
  );
  const mccMolsSet = useMemo(
    () => new Set<string>(analysisStatus?.mcc_mols_ids ?? []),
    [analysisStatus],
  );

  const filteredMolecules = useMemo(() => {
    let result = allMolecules;
    if (minPchembl > 0) {
      result = result.filter(
        (m) => m.pchembl_value != null && m.pchembl_value >= minPchembl,
      );
    }
    if (selectedTypes.length > 0) {
      result = result.filter((m) => selectedTypes.includes(m.type));
    }
    if (mccFilter !== "all") {
      result = result.filter((m) => {
        const inSims = mccSimsSet.has(m.molecule_chembl_id);
        const inMols = mccMolsSet.has(m.molecule_chembl_id);
        if (mccFilter === "both") return inSims && inMols;
        if (mccFilter === "sims") return inSims && !inMols;
        if (mccFilter === "mols") return inMols && !inSims;
        return true;
      });
    }
    if (sortDesc) {
      result = [...result].sort((a, b) => {
        const av = a.pchembl_value ?? -Infinity;
        const bv = b.pchembl_value ?? -Infinity;
        return bv - av;
      });
    }
    return result;
  }, [allMolecules, minPchembl, selectedTypes, mccFilter, mccSimsSet, mccMolsSet, sortDesc]);

  const molTotalPages = Math.max(1, Math.ceil(filteredMolecules.length / PER_PAGE));

  const displayedMolecules = useMemo(() => {
    const start = (molPage - 1) * PER_PAGE;
    return filteredMolecules.slice(start, start + PER_PAGE);
  }, [filteredMolecules, molPage]);

  const onMolPageChange = useCallback(
    (page: number) => {
      setMolPage(Math.max(1, Math.min(page, molTotalPages)));
    },
    [molTotalPages],
  );

  useEffect(() => { setMolPage(1); }, [minPchembl, selectedTypes, mccFilter, sortDesc]);

  const toggleType = useCallback((t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }, []);

  // ── Status da análise ─────────────────────────────────────────────────────
  const loadAnalysisStatus = useCallback(() => {
    setAnalysisStatusLoading(true);
    chemblUseCase
      .getAnalysisStatus(jobIdNum, token())
      .then(setAnalysisStatus)
      .catch(() => {})
      .finally(() => setAnalysisStatusLoading(false));
  }, [jobIdNum, chemblUseCase]);

  useEffect(() => { loadAnalysisStatus(); }, [loadAnalysisStatus]);

  // Polling automático enquanto análise estiver em andamento (mesmo ao voltar à página)
  useEffect(() => {
    if (!analysisStatus?.analysis_running) return;
    const interval = setInterval(async () => {
      try {
        const refreshed = await chemblUseCase.getAnalysisStatus(jobIdNum, token());
        setAnalysisStatus(refreshed);
        if (refreshed.has_analysis) {
          setAnalysisSubmitted(false);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [analysisStatus?.analysis_running, jobIdNum, chemblUseCase]);

  // ── Análise molecular ─────────────────────────────────────────────────────
  const [fingerprint, setFingerprint] = useState<"morgan" | "maccs" | "pharmacophore">("morgan");
  const [metric, setMetric] = useState<"Tanimoto" | "Dice" | "Cosine">("Tanimoto");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSubmitted, setAnalysisSubmitted] = useState(false);

  const onRunAnalysis = useCallback(() => {
    if (!job) return;
    setAnalysisLoading(true);
    chemblUseCase
      .iniciarAnalise(
        { job_id: job.id, fingerprint, metric, base_output_path: job.base_output_path },
        token(),
      )
      .then(() => {
        setAnalysisSubmitted(true);
        loadAnalysisStatus(); // atualiza status; o polling automático assume daqui
      })
      .catch(() => {})
      .finally(() => setAnalysisLoading(false));
  }, [job, fingerprint, metric, chemblUseCase, loadAnalysisStatus]);

  // ── Redes de similaridade ─────────────────────────────────────────────────
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [networksLoading, setNetworksLoading] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkInfo | null>(null);

  useEffect(() => {
    if (!analysisStatus?.has_analysis) return;
    setNetworksLoading(true);
    chemblUseCase
      .getNetworks(jobIdNum, token())
      .then((res) => setNetworks(res.networks))
      .catch(() => {})
      .finally(() => setNetworksLoading(false));
  }, [analysisStatus?.has_analysis, jobIdNum, chemblUseCase]);

  const onOpenNetwork = useCallback((net: NetworkInfo) => setSelectedNetwork(net), []);
  const onCloseNetwork = useCallback(() => setSelectedNetwork(null), []);
  const getPlotUrl = useCallback(
    (filename: string) => chemblUseCase.getPlotUrl(jobIdNum, filename, token()),
    [jobIdNum, chemblUseCase],
  );

  // ── Modal 2D ──────────────────────────────────────────────────────────────
  const [selectedMol, setSelectedMol] = useState<ChemblMoleculeModel | null>(null);
  const onSelectMol = useCallback((mol: ChemblMoleculeModel) => setSelectedMol(mol), []);
  const onCloseMol = useCallback(() => setSelectedMol(null), []);

  // ── Navbar ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => { logout(); navigate("/"); }, [logout, navigate]);
  const voltarChembl = useCallback(() => navigate("/chembl"), [navigate]);

  return {
    job, jobLoading,
    allMolecules, filteredMolecules, displayedMolecules,
    molLoading, molPage, molTotalPages, onMolPageChange,
    summary, uniqueTypes,
    minPchembl, setMinPchembl,
    selectedTypes, setSelectedTypes, toggleType,
    sortDesc, setSortDesc,
    mccFilter, setMccFilter,
    analysisStatus, analysisStatusLoading,
    analysisLoading, analysisSubmitted,
    fingerprint, metric,
    onFingerprintChange: setFingerprint,
    onMetricChange: setMetric,
    onRunAnalysis,
    mccSet, mccSimsSet, mccMolsSet,
    networks, networksLoading, selectedNetwork, onOpenNetwork, onCloseNetwork, getPlotUrl,
    selectedMol, onSelectMol, onCloseMol,
    handleLogout, voltarChembl,
  };
}
