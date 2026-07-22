// pages/SearchPage/SearchPage.tsx
import { useSearchPage } from "./useSearchPage";
import SearchTemplate from "../../templates/search/SearchTemplate";
import type { SearchUseCase } from "../../data/usecases/search.usecase";
import type { DashboardUseCase } from "../../data/usecases/dashboard.usecase";

interface SearchPageProps {
  searchUseCase: SearchUseCase;
  dashboardUseCase: DashboardUseCase;
}

export default function SearchPage({
  searchUseCase,
  dashboardUseCase,
}: SearchPageProps) {
  const {
    user,
    input,
    setInput,
    fase,
    resultados,
    erroMsg,
    proteinas,
    limiteEscolhido,
    setLimiteEscolhido,
    barraRef,
    pctTextoRef,
    contadorRef,
    labelRef,
    coletadasRef,
    protAtualRef,
    menuAberto,
    menuRef,
    handleLogout,
    toggleMenu,
    irParaHistorico,
    irParaMeusPdbs,
    irParaRedocking,
    irParaConfiguracoes,
    pausar,
    cancelar,
    iniciarBusca,
    resetBusca,
    dashboard,
  } = useSearchPage(searchUseCase, dashboardUseCase);

  return (
    <SearchTemplate
      user={user}
      input={input}
      setInput={setInput}
      fase={fase}
      resultados={resultados}
      erroMsg={erroMsg}
      proteinas={proteinas}
      limiteEscolhido={limiteEscolhido}
      setLimiteEscolhido={setLimiteEscolhido}
      barraRef={barraRef}
      pctTextoRef={pctTextoRef}
      contadorRef={contadorRef}
      labelRef={labelRef}
      coletadasRef={coletadasRef}
      protAtualRef={protAtualRef}
      menuAberto={menuAberto}
      menuRef={menuRef}
      handleLogout={handleLogout}
      toggleMenu={toggleMenu}
      irParaHistorico={irParaHistorico}
      irParaMeusPdbs={irParaMeusPdbs}
      irParaRedocking={irParaRedocking}
      irParaConfiguracoes={irParaConfiguracoes}
      pausar={pausar}
      cancelar={cancelar}
      iniciarBusca={iniciarBusca}
      resetBusca={resetBusca}
      dashboard={dashboard}
    />
  );
}
