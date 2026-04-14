// contexts/RedockingContext.tsx
// Mantém o job ativo e o CSV atual em memória enquanto o usuário navega entre rotas.
// Faz polling a cada 10 segundos enquanto o job está pending/running.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CsvLinha, RedockingJobModel } from "../domain/models/redocking.model";
import { parseCsvContent } from "../domain/models/redocking.model";
import type { RedockingUseCase } from "../data/usecases/redocking.usecase";

interface RedockingContextValue {
  // Job ativo
  activeJob: RedockingJobModel | null;
  setActiveJob: (job: RedockingJobModel) => void;
  clearActiveJob: () => void;
  // CSV atual do usuário
  csvLinhas: CsvLinha[];
  csvFileName: string;
  salvarCsvNoServidor: (csvContent: string, fileName?: string, target?: string, baseInputPath?: string) => Promise<void>;
  carregarCsvDoServidor: () => Promise<void>;
}

const RedockingContext = createContext<RedockingContextValue | null>(null);

export function useRedocking(): RedockingContextValue {
  const ctx = useContext(RedockingContext);
  if (!ctx) throw new Error("useRedocking must be used inside RedockingProvider");
  return ctx;
}

interface RedockingProviderProps {
  children: ReactNode;
  redockingUseCase: RedockingUseCase;
}

export function RedockingProvider({ children, redockingUseCase }: RedockingProviderProps) {
  const [activeJob, setActiveJobState] = useState<RedockingJobModel | null>(null);
  const [csvLinhas, setCsvLinhas] = useState<CsvLinha[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (jobId: number) => {
      stopPolling();
      intervalRef.current = setInterval(async () => {
        const token = localStorage.getItem("access_token") ?? "";
        try {
          const updated = await redockingUseCase.statusJob(jobId, token);
          setActiveJobState(updated);
          if (updated.status === "done" || updated.status === "error") {
            stopPolling();
          }
        } catch {
          // ignora erros transientes de rede no polling
        }
      }, 10_000);
    },
    [redockingUseCase, stopPolling],
  );

  const setActiveJob = useCallback(
    (job: RedockingJobModel) => {
      setActiveJobState(job);
      if (job.status === "pending" || job.status === "running") {
        startPolling(job.id);
      }
    },
    [startPolling],
  );

  const clearActiveJob = useCallback(() => {
    stopPolling();
    setActiveJobState(null);
  }, [stopPolling]);

  const salvarCsvNoServidor = useCallback(
    async (csvContent: string, fileName?: string, target?: string, baseInputPath?: string) => {
      setCsvLinhas(parseCsvContent(csvContent));
      if (fileName) setCsvFileName(fileName);
      const token = localStorage.getItem("access_token") ?? "";
      try {
        await redockingUseCase.salvarCsv(csvContent, token, target, baseInputPath);
      } catch {
        // ignora falhas de rede — os dados já estão em memória
      }
    },
    [redockingUseCase],
  );

  const carregarCsvDoServidor = useCallback(async () => {
    const token = localStorage.getItem("access_token") ?? "";
    try {
      const content = await redockingUseCase.buscarCsv(token);
      if (content) {
        setCsvLinhas(parseCsvContent(content));
        setCsvFileName("pdb_codes.csv");
      }
    } catch {
      // sem CSV salvo — ignora
    }
  }, [redockingUseCase]);

  // Para o polling ao desmontar
  useEffect(() => () => stopPolling(), [stopPolling]);

  return (
    <RedockingContext.Provider
      value={{
        activeJob,
        setActiveJob,
        clearActiveJob,
        csvLinhas,
        csvFileName,
        salvarCsvNoServidor,
        carregarCsvDoServidor,
      }}
    >
      {children}
    </RedockingContext.Provider>
  );
}
