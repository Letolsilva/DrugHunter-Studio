// hooks/useDashboard.ts
import { useState, useMemo, useCallback, useRef } from "react";
import type { PdbResultModel } from "../domain/models/search.model";
import type { DashboardUseCase } from "../data/usecases/dashboard.usecase";

const PDB_DOWNLOAD_URL = (pdbId: string) => `/api/download/pdb/${pdbId}`;
const BATCH_DELAY_MS = 150;

export interface BatchProgress {
  atual: number;
  total: number;
}

export interface UseDashboardReturn {
  filtroOrganismo: string;
  filtroProteina: string;
  filtroResolucaoMax: string;
  filtroLigante: string;
  busca: string;
  ordem: string;
  pagina: number;
  setFiltroOrganismo: (v: string) => void;
  setFiltroProteina: (v: string) => void;
  setFiltroResolucaoMax: (v: string) => void;
  setFiltroLigante: (v: string) => void;
  setBusca: (v: string) => void;
  setOrdem: (v: string) => void;
  onChangePage: (p: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  organismos: string[];
  filtrados: PdbResultModel[];
  paginas: number;
  paginaAtual: PdbResultModel[];
  dadosResolucao: { name: string; value: number }[];
  dadosMetodo: { name: string; value: number }[];
  dadosProteina: { name: string; value: number }[];
  downloadCSV: () => Promise<void>;
  limparFiltros: () => void;
  // SeleÃ§Ã£o e download em lote
  selectedIds: Set<string>;
  toggleSelected: (pdbId: string) => void;
  toggleSelectAll: () => void;
  isAllSelected: boolean;
  batchProgress: BatchProgress | null;
  downloadBatch: () => Promise<void>;
  downloadSingle: (pdbId: string) => Promise<void>;
  downloadingIds: Set<string>;
  recentlyDownloadedIds: Set<string>;
  failedIds: Set<string>;
  dirHandle: FileSystemDirectoryHandle | null;
  pickFolder: () => Promise<void>;
  toast: string | null;
  toastVariant: "success" | "error";
}

async function _fetchAndSaveFile(
  pdbId: string,
  dirHandle: FileSystemDirectoryHandle,
): Promise<void> {
  const token = localStorage.getItem("access_token");
  const headers: HeadersInit = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const res = await fetch(PDB_DOWNLOAD_URL(pdbId), { headers });
  if (!res.ok) throw new Error(`Erro ao baixar ${pdbId}: ${res.status}`);
  const blob = await res.blob();
  const fileHandle = await dirHandle.getFileHandle(`${pdbId}.pdb`, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

function _sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useDashboard(
  dados: PdbResultModel[],
  dashboardUseCase: DashboardUseCase,
): UseDashboardReturn {
  const [filtroOrganismo, setFiltroOrganismo] = useState("");
  const [filtroProteina, setFiltroProteina] = useState("");
  const [filtroResolucaoMax, setFiltroResolucaoMax] = useState("");
  const [filtroLigante, setFiltroLigante] = useState("");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("resolucao");
  const [pagina, setPagina] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(
    null,
  );
  const [recentlyDownloadedIds, setRecentlyDownloadedIds] = useState<
    Set<string>
  >(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">(
    "success",
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  const showToast = useCallback(
    (message: string, variant: "success" | "error" = "success") => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToastVariant(variant);
      setToast(message);
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    },
    [],
  );
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(
    null,
  );

  const result = useMemo(
    () =>
      dashboardUseCase.processar(
        dados,
        {
          filtroOrganismo,
          filtroProteina,
          filtroResolucaoMax,
          filtroLigante,
          busca,
          ordem,
        },
        pagina,
      ),
    [
      dados,
      filtroOrganismo,
      filtroProteina,
      filtroResolucaoMax,
      filtroLigante,
      busca,
      ordem,
      pagina,
      dashboardUseCase,
    ],
  );

  const pickFolder = useCallback(async () => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });
      dirHandleRef.current = handle;
      setDirHandle(handle);
    } catch {
      // Usuário cancelou o picker
    }
  }, []);

  const _ensureFolder =
    useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
      if (dirHandleRef.current) return dirHandleRef.current;
      try {
        const handle = await (window as any).showDirectoryPicker({
          mode: "readwrite",
        });
        dirHandleRef.current = handle;
        setDirHandle(handle);
        return handle;
      } catch {
        return null;
      }
    }, []);

  const downloadSingle = useCallback(
    async (pdbId: string) => {
      const handle = await _ensureFolder();
      if (!handle) return;
      setDownloadingIds((prev) => new Set(prev).add(pdbId));
      let success = false;
      try {
        await _fetchAndSaveFile(pdbId, handle);
        success = true;
      } catch {
        setFailedIds((prev) => new Set(prev).add(pdbId));
        showToast(`${pdbId} não possui arquivo legacy disponível`, "error");
        setTimeout(() => {
          setFailedIds((prev) => {
            const next = new Set(prev);
            next.delete(pdbId);
            return next;
          });
        }, 3000);
      } finally {
        setDownloadingIds((prev) => {
          const next = new Set(prev);
          next.delete(pdbId);
          return next;
        });
      }
      if (success) {
        setRecentlyDownloadedIds((prev) => new Set(prev).add(pdbId));
        showToast(`${pdbId}.pdb baixado com sucesso`, "success");
        setTimeout(() => {
          setRecentlyDownloadedIds((prev) => {
            const next = new Set(prev);
            next.delete(pdbId);
            return next;
          });
        }, 2000);
      }
    },
    [_ensureFolder, showToast],
  );

  const downloadBatch = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const handle = await _ensureFolder();
    if (!handle) return;

    const ids = [...selectedIds];
    setBatchProgress({ atual: 0, total: ids.length });
    let falhas = 0;

    for (let i = 0; i < ids.length; i++) {
      try {
        await _fetchAndSaveFile(ids[i], handle);
      } catch {
        falhas++;
      }
      setBatchProgress({ atual: i + 1, total: ids.length });
      if (i < ids.length - 1) await _sleep(BATCH_DELAY_MS);
    }

    setBatchProgress(null);
    setSelectedIds(new Set());
    const sucessos = ids.length - falhas;
    if (falhas === 0) {
      showToast(
        `${ids.length} arquivo${ids.length > 1 ? "s" : ""} baixado${ids.length > 1 ? "s" : ""} com sucesso`,
        "success",
      );
    } else if (sucessos === 0) {
      showToast(`Nenhum arquivo legacy estava disponível`, "error");
    } else {
      showToast(
        `${sucessos} baixado${sucessos > 1 ? "s" : ""}, ${falhas} sem arquivo legacy`,
        "error",
      );
    }
  }, [selectedIds, _ensureFolder, showToast]);

  const downloadCSV = useCallback(async () => {
    const csv = dashboardUseCase.gerarCSV(result.filtrados);
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: "pdb_resultados.csv",
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(csv);
      await writable.close();
    } catch {
      // Fallback se showSaveFilePicker nÃ£o for suportado ou usuÃ¡rio cancelar
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: "pdb_resultados.csv",
      });
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [dashboardUseCase, result.filtrados]);

  const toggleSelected = useCallback((pdbId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pdbId)) next.delete(pdbId);
      else next.add(pdbId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allIds = result.filtrados.map((d) => d.pdb_id);
      const allSelected = allIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(allIds);
    });
  }, [result.filtrados]);

  const isAllSelected =
    result.filtrados.length > 0 &&
    result.filtrados.every((d) => selectedIds.has(d.pdb_id));

  const limparFiltros = useCallback(() => {
    setFiltroOrganismo("");
    setFiltroProteina("");
    setFiltroResolucaoMax("");
    setFiltroLigante("");
    setBusca("");
    setPagina(1);
  }, []);

  const onChangePage = useCallback((p: number) => setPagina(p), []);
  const onPrevPage = useCallback(
    () => setPagina((p) => Math.max(1, p - 1)),
    [],
  );
  const onNextPage = useCallback(
    () => setPagina((p) => Math.min(result.paginas, p + 1)),
    [result.paginas],
  );

  return {
    filtroOrganismo,
    filtroProteina,
    filtroResolucaoMax,
    filtroLigante,
    busca,
    ordem,
    pagina,
    setFiltroOrganismo,
    setFiltroProteina,
    setFiltroResolucaoMax,
    setFiltroLigante,
    setBusca,
    setOrdem,
    onChangePage,
    onPrevPage,
    onNextPage,
    organismos: result.organismos,
    filtrados: result.filtrados,
    paginas: result.paginas,
    paginaAtual: result.paginaAtual,
    dadosResolucao: result.charts.resolucao,
    dadosMetodo: result.charts.metodo,
    dadosProteina: result.charts.proteina,
    downloadCSV,
    limparFiltros,
    selectedIds,
    toggleSelected,
    toggleSelectAll,
    isAllSelected,
    batchProgress,
    downloadBatch,
    downloadSingle,
    downloadingIds,
    recentlyDownloadedIds,
    failedIds,
    dirHandle,
    pickFolder,
    toast,
    toastVariant,
  };
}
