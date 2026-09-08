// pages/AdmetPage/useAdmetPage.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { AdmetUseCase } from "../../data/usecases/admet.usecase";
import type { ConsensusUseCase } from "../../data/usecases/consensus.usecase";
import type { AdmetMoleculeModel, AdmetResultModel } from "../../domain/models/admet.model";

export interface UseAdmetPageReturn {
  result: AdmetResultModel | null;
  loading: boolean;
  error: string | null;

  molecules: AdmetMoleculeModel[];
  allMoleculesForChart: AdmetMoleculeModel[];
  molLoading: boolean;
  molPage: number;
  molPages: number;
  molTotal: number;

  filterBbb: string | null;
  filterHia: string | null;
  onFilterBbb: (v: string | null) => void;
  onFilterHia: (v: string | null) => void;
  onPageChange: (p: number) => void;

  selectedMol: AdmetMoleculeModel | null;
  onSelectMol: (mol: AdmetMoleculeModel) => void;
  onCloseMol: () => void;

  token: string;
  handleLogout: () => void;
  voltarChembl: () => void;
  onRerun: () => void;

  // Consenso
  consensusStatus: "none" | "running" | "done" | "error";
  onGoConsensus: () => void;
}

export function useAdmetPage(
  admetUseCase: AdmetUseCase,
  consensusUseCase?: ConsensusUseCase,
): UseAdmetPageReturn {
  const { resultId } = useParams<{ resultId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const token = localStorage.getItem("access_token") ?? "";

  const [result, setResult] = useState<AdmetResultModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [molecules, setMolecules] = useState<AdmetMoleculeModel[]>([]);
  const [allMoleculesForChart, setAllMoleculesForChart] = useState<AdmetMoleculeModel[]>([]);
  const [molLoading, setMolLoading] = useState(false);
  const [molPage, setMolPage] = useState(1);
  const [molPages, setMolPages] = useState(1);
  const [molTotal, setMolTotal] = useState(0);

  const [filterBbb, setFilterBbb] = useState<string | null>(null);
  const [filterHia, setFilterHia] = useState<string | null>(null);

  const [selectedMol, setSelectedMol] = useState<AdmetMoleculeModel | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Inicializa: se vier com item_id na query, dispara o run primeiro
  useEffect(() => {
    const itemId = searchParams.get("item_id");
    if (!itemId && !resultId) {
      setError("Parâmetros insuficientes.");
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        if (itemId) {
          // Verifica se já existe um resultado para este item
          const existing = await admetUseCase.getByItem(Number(itemId), token);
          if (existing) {
            navigate(`/admet/${existing.id}`, { replace: true });
            return;
          }
          // Se não existe, roda a análise
          const newResult = await admetUseCase.run(Number(itemId), token);
          navigate(`/admet/${newResult.id}`, { replace: true });
          return;
        }

        // Veio com resultId — carrega direto
        const r = await admetUseCase.getResult(Number(resultId), token);
        if (!isMounted.current) return;
        setResult(r);
        if (r.status === "done") {
          setLoading(false);
          loadMolecules(r.id, 1, null, null);
          loadAllForChart(r.id);
        } else if (r.status === "error") {
          setError(r.error_msg ?? "Erro na análise ADMET.");
          setLoading(false);
        } else {
          startPolling(r.id);
        }
      } catch (e) {
        if (!isMounted.current) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar.");
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultId]);

  const startPolling = useCallback(
    (id: number) => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(async () => {
        try {
          const r = await admetUseCase.getResult(id, token);
          if (!isMounted.current) return;
          setResult(r);
          if (r.status === "done") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setLoading(false);
            loadMolecules(id, 1, null, null);
            loadAllForChart(id);
          } else if (r.status === "error") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setError(r.error_msg ?? "Erro na análise ADMET.");
            setLoading(false);
          }
        } catch {
          // Mantém polling
        }
      }, 2500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token],
  );

  const loadMolecules = useCallback(
    async (id: number, page: number, bbb: string | null, hia: string | null) => {
      setMolLoading(true);
      try {
        const data = await admetUseCase.listMolecules(
          id, token, page, 50,
          bbb ?? undefined,
          hia ?? undefined,
        );
        if (!isMounted.current) return;
        setMolecules(data.molecules);
        setMolPage(data.page);
        setMolPages(data.pages);
        setMolTotal(data.total);
      } catch {
        // silencia
      } finally {
        if (isMounted.current) setMolLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token],
  );

  // Carrega TODAS as moléculas para o gráfico (sem paginação, sem filtro)
  const loadAllForChart = useCallback(
    async (id: number) => {
      try {
        const data = await admetUseCase.listMolecules(id, token, 1, 9999);
        if (!isMounted.current) return;
        setAllMoleculesForChart(data.molecules);
      } catch {
        // silencia
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token],
  );

  const onFilterBbb = useCallback(
    (v: string | null) => {
      setFilterBbb(v);
      setMolPage(1);
      if (result) loadMolecules(result.id, 1, v, filterHia);
    },
    [result, filterHia, loadMolecules],
  );

  const onFilterHia = useCallback(
    (v: string | null) => {
      setFilterHia(v);
      setMolPage(1);
      if (result) loadMolecules(result.id, 1, filterBbb, v);
    },
    [result, filterBbb, loadMolecules],
  );

  const onPageChange = useCallback(
    (p: number) => {
      if (result) loadMolecules(result.id, p, filterBbb, filterHia);
    },
    [result, filterBbb, filterHia, loadMolecules],
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const voltarChembl = useCallback(() => navigate(-1), [navigate]);

  // ── Consenso — status + navegação ─────────────────────────────────────────
  const [consensusStatus, setConsensusStatus] = useState<"none" | "running" | "done" | "error">("none");
  const [consensusJobId, setConsensusJobId] = useState<number | null>(null);

  useEffect(() => {
    if (!consensusUseCase || !result || result.status !== "done") return;
    consensusUseCase.getByAdmet(result.id, token).then((job) => {
      if (!isMounted.current) return;
      if (!job) { setConsensusStatus("none"); return; }
      setConsensusJobId(job.id);
      if (job.status === "done") setConsensusStatus("done");
      else if (job.status === "error") setConsensusStatus("error");
      else setConsensusStatus("running");
    }).catch(() => setConsensusStatus("none"));
  }, [result?.id, result?.status]);  // eslint-disable-line react-hooks/exhaustive-deps

  const onGoConsensus = useCallback(() => {
    if (!result) return;
    if (consensusStatus === "done" || consensusStatus === "running") {
      if (consensusJobId) navigate(`/consensus/${consensusJobId}`);
    } else {
      navigate(`/consensus?admet_id=${result.id}`);
    }
  }, [result, consensusStatus, consensusJobId, navigate]);

  // Reexecuta o ADMET para o mesmo item (reset + nova análise)
  const onRerun = useCallback(async () => {
    if (!result?.chembl_job_item_id) return;
    setError(null);
    setLoading(true);
    setMolecules([]);
    setAllMoleculesForChart([]);
    try {
      const newResult = await admetUseCase.run(result.chembl_job_item_id, token);
      if (!isMounted.current) return;
      setResult(newResult);
      startPolling(newResult.id);
    } catch (e) {
      if (!isMounted.current) return;
      setError(e instanceof Error ? e.message : "Erro ao reexecutar.");
      setLoading(false);
    }
  }, [result, token, admetUseCase, startPolling]);

  return {
    result,
    loading,
    error,
    molecules,
    allMoleculesForChart,
    molLoading,
    molPage,
    molPages,
    molTotal,
    filterBbb,
    filterHia,
    onFilterBbb,
    onFilterHia,
    onPageChange,
    selectedMol,
    onSelectMol: setSelectedMol,
    onCloseMol: () => setSelectedMol(null),
    token,
    handleLogout,
    voltarChembl,
    onRerun,
    consensusStatus,
    onGoConsensus,
  };
}
