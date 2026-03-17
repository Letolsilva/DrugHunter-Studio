// pages/HistoryListPage/HistoryListPage.tsx
import { useHistoryListPage } from "./useHistoryListPage";
import HistoryListTemplate from "../../templates/history/HistoryListTemplate";
import type { HistoryUseCase } from "../../data/usecases/history.usecase";

interface HistoryListPageProps {
  historyUseCase: HistoryUseCase;
}

export default function HistoryListPage({
  historyUseCase,
}: HistoryListPageProps) {
  const {
    fase,
    historico,
    erroMsg,
    abrirDetalhe,
    deletarItem,
    handleLogout,
    pagina,
    paginas,
    grupos,
    setPagina,
  } = useHistoryListPage(historyUseCase);

  return (
    <HistoryListTemplate
      fase={fase}
      historico={historico}
      erroMsg={erroMsg}
      abrirDetalhe={abrirDetalhe}
      deletarItem={deletarItem}
      handleLogout={handleLogout}
      pagina={pagina}
      paginas={paginas}
      grupos={grupos}
      setPagina={setPagina}
    />
  );
}
