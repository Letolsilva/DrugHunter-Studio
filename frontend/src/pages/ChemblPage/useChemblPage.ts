// pages/ChemblPage/useChemblPage.ts
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { ChemblUseCase } from "../../data/usecases/chembl.usecase";
import {
  DEFAULT_BIOACT_FILTERS,
  DEFAULT_MOL_FILTERS,
  DEFAULT_SIM_FILTERS,
  DEFAULT_TARGET_FILTERS,
  type ChemblItemConfig,
  type ChemblJobModel,
} from "../../domain/models/chembl.model";

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeItem(): ChemblItemConfig {
  return {
    id: makeId(),
    target_names: [],
    chembl_search_id: "",
    target_filters: { ...DEFAULT_TARGET_FILTERS, type__in: ["SINGLE PROTEIN"] },
    bioact_filters: { ...DEFAULT_BIOACT_FILTERS },
    mol_filters: { ...DEFAULT_MOL_FILTERS },
    sim_filters: { ...DEFAULT_SIM_FILTERS },
  };
}

export interface UseChemblPageReturn {
  items: ChemblItemConfig[];
  baseOutputPath: string;
  setBaseOutputPath: (v: string) => void;
  onItemChange: (id: string, patch: Partial<ChemblItemConfig>) => void;
  onItemRemove: (id: string) => void;
  onAddItem: () => void;

  submitting: boolean;
  submitError: string | null;
  onRunGrupo: () => void;

  jobs: ChemblJobModel[];
  jobsLoading: boolean;
  onDeleteJob: (jobId: number) => void;
  historyPage: number;
  historyTotalPages: number;
  onHistoryPageChange: (page: number) => void;

  handleLogout: () => void;
}

export function useChemblPage(chemblUseCase: ChemblUseCase): UseChemblPageReturn {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // ── Formulário ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<ChemblItemConfig[]>([makeItem()]);
  const [baseOutputPath, setBaseOutputPath] = useState(
    () => localStorage.getItem("chembl_output_path") ?? ""
  );

  const onItemChange = useCallback((id: string, patch: Partial<ChemblItemConfig>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const onItemRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const onAddItem = useCallback(() => {
    setItems((prev) => [...prev, makeItem()]);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onRunGrupo = useCallback(async () => {
    const token = localStorage.getItem("access_token") ?? "";
    const validItems = items.filter((it) => it.target_names.some((t) => t.trim()));
    if (!validItems.length || submitting) return;

    localStorage.setItem("chembl_output_path", baseOutputPath);
    setSubmitting(true);
    setSubmitError(null);

    const flatTargets = validItems.flatMap((it) =>
      it.target_names
        .filter((t) => t.trim())
        .map((targetName) => ({ targetName, item: it }))
    );

    const payload = {
      items: flatTargets.map(({ targetName, item: it }) => ({
        target_name: targetName,
        folder_name: targetName.replace(/\s+/g, "_").replace(/[^A-Za-z0-9_-]/g, ""),
        chembl_search_id: it.chembl_search_id.trim() || undefined,
        target_filters: it.target_filters,
        bioact_filters: it.bioact_filters,
        mol_filters: it.mol_filters,
        sim_filters: it.sim_filters,
      })),
      base_output_path: baseOutputPath,
    };

    try {
      const job = await chemblUseCase.startJob(payload, token);
      navigate(`/chembl/${job.id}/resultados`);
    } catch (err) {
      setSubmitError(String(err));
      setSubmitting(false);
    }
  }, [items, baseOutputPath, submitting, chemblUseCase, navigate]);

  // ── Histórico ─────────────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<ChemblJobModel[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  const loadJobs = useCallback(() => {
    const token = localStorage.getItem("access_token") ?? "";
    setJobsLoading(true);
    chemblUseCase
      .listarJobs(token)
      .then((res) => setJobs(res.jobs))
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [chemblUseCase]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const onDeleteJob = useCallback((jobId: number) => {
    const token = localStorage.getItem("access_token") ?? "";
    chemblUseCase.deletarJob(jobId, token)
      .then(() => setJobs((prev) => prev.filter((j) => j.id !== jobId)))
      .catch(() => {});
  }, [chemblUseCase]);

  // ── Paginação do histórico ────────────────────────────────────────────────
  const ITEMS_PER_PAGE = 8;
  const historyTotalPages = Math.max(1, Math.ceil(jobs.length / ITEMS_PER_PAGE));
  const [historyPage, setHistoryPage] = useState(1);
  const onHistoryPageChange = useCallback((page: number) => {
    setHistoryPage(Math.max(1, Math.min(page, historyTotalPages)));
  }, [historyTotalPages]);
  useEffect(() => { setHistoryPage(1); }, [jobs.length]);

  // ── Navbar ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  return {
    items, baseOutputPath, setBaseOutputPath,
    onItemChange, onItemRemove, onAddItem,
    submitting, submitError, onRunGrupo,
    jobs, jobsLoading, onDeleteJob,
    historyPage, historyTotalPages, onHistoryPageChange,
    handleLogout,
  };
}
