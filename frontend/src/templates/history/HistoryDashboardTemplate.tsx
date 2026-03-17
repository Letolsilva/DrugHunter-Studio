// templates/history/HistoryDashboardTemplate.tsx
import { useNavigate } from "react-router-dom";
import DashboardTemplate from "../dashboard/DashboardTemplate";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  ArrowLeftIcon,
  CalendarIcon,
  WarningIcon,
} from "../../components/icons";
import { Navbar } from "../../components/layout";
import { useAuth } from "../../contexts/AuthContext";
import type { UseHistoryDashboardPageReturn } from "../../pages/HistoryDashboardPage/useHistoryDashboardPage";

export default function HistoryDashboardTemplate({
  fase,
  detalhe,
  erroMsg,
  voltarLista,
  novaBusca,
  handleLogout,
  dashboard,
}: UseHistoryDashboardPageReturn) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={voltarLista}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Voltar à busca"
          >
            <ArrowLeftIcon size={16} />
          </button>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
          <span className="ml-1 border-l border-outline pl-3 font-mono text-[12px] text-foreground-subtle">
            Histórico de Buscas
          </span>
        </Navbar.Left>

        <Navbar.Right>
          <Button
            variant="ghost"
            onClick={handleLogout}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Sair
          </Button>
        </Navbar.Right>
      </Navbar>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 py-10">
        {/* Carregando */}
        {fase === "carregando" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <span className="font-mono text-[13px] text-foreground-subtle">
              Carregando resultados...
            </span>
          </div>
        )}

        {/* Erro */}
        {fase === "erro" && (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <WarningIcon size={32} className="text-red" />
            <p className="text-[14px] text-red">{erroMsg}</p>
          </div>
        )}

        {/* Detalhe */}
        {fase === "detalhe" && detalhe && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="rounded border border-outline bg-panel px-3.5 py-1.5 font-mono text-[12px] text-foreground-subtle">
                {detalhe.data_local} {detalhe.hora_local}
                {detalhe.veio_do_cache && (
                  <span className="ml-2.5 text-[10px] font-bold tracking-[0.5px] text-accent">
                    CACHE
                  </span>
                )}
              </div>
            </div>

            <DashboardTemplate
              {...dashboard}
              dados={detalhe.proteinas}
              proteinas={detalhe.proteina_query
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)}
              onNovaBusca={novaBusca}
            />
          </div>
        )}
      </main>
    </div>
  );
}
