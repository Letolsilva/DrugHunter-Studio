// templates/admet/AdmetTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import {
  ArrowLeftIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from "../../components/icons";
import { AdmetSummaryCards } from "../../components/admet/AdmetSummaryCards";
import { AdmetBoiledEgg } from "../../components/admet/AdmetBoiledEgg";
import { AdmetMoleculeModal } from "../../components/admet/AdmetMoleculeModal";
import { AdmetResultsTable } from "../../components/admet/AdmetResultsTable";
import { AdmetDownloads } from "../../components/admet/AdmetDownloads";
import type { UseAdmetPageReturn } from "../../pages/AdmetPage/useAdmetPage";

export default function AdmetTemplate(props: UseAdmetPageReturn) {
  const {
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
    onSelectMol,
    onCloseMol,
    token,
    handleLogout,
    voltarChembl,
    onRerun,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* Navbar */}
      <Navbar>
        <Navbar.Left>
          <button
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[12px] text-foreground-subtle hover:bg-surface-secondary transition-colors"
            onClick={voltarChembl}
          >
            <ArrowLeftIcon size={14} />
            Voltar
          </button>
        </Navbar.Left>
        <Navbar.Middle>
          <MiddleBar activeModule="chembl" />
        </Navbar.Middle>
        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            trigger={<MenuIcon size={18} />}
          >
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => navigate("/configuracoes")}
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={() => navigate("/ajuda")}
              divider
            />
            <DropdownMenu.Item
              icon={<LogoutIcon size={14} />}
              label="Sair"
              onClick={handleLogout}
            />
          </DropdownMenu>
        </Navbar.Right>
      </Navbar>

      {/* Conteúdo */}
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <h1 className="font-mono text-[18px] font-bold text-foreground">
            ADMET
          </h1>
          <p className="font-mono text-[12px] text-foreground-subtle mt-0.5">
            Barreira hematoencefálica · Absorção intestinal · Toxicidade
          </p>
        </div>

        {/* Estado de loading / erro / running */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-20">
            <Spinner style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p className="font-mono text-[13px] text-foreground-subtle">
              {result?.status === "running" || !result
                ? "Analisando moléculas..."
                : "Carregando..."}
            </p>
            {result && (
              <p className="font-mono text-[11px] text-foreground-subtle opacity-60">
                Isso pode levar alguns segundos dependendo do número de
                compostos.
              </p>
            )}
          </div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-4">
            <p className="font-mono text-[12px] text-red-400">{error}</p>
            <button
              onClick={onRerun}
              className="cursor-pointer shrink-0 font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
              style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Resultados */}
        {result?.status === "done" && !loading && (
          <div className="flex flex-col gap-6">
            {/* Cards de resumo */}
            <AdmetSummaryCards result={result} />

            {/* Downloads + Rodar novamente */}
            <div className="rounded-xl border border-outline bg-panel p-4 flex items-center justify-between gap-4 flex-wrap">
              <AdmetDownloads
                resultId={result.id}
                token={token}
                hasToxic={(result.excluded_toxic ?? 0) > 0}
              />
              <button
                onClick={onRerun}
                className="cursor-pointer shrink-0 font-mono text-[11px] rounded-lg border px-3 py-1.5 transition-colors hover:bg-surface-secondary"
                style={{ borderColor: "var(--color-outline)", color: "var(--color-foreground-subtle)" }}
              >
                ↺ Rodar novamente
              </button>
            </div>

            {/* BOILED-Egg em cima — largura total */}
            <AdmetBoiledEgg
              molecules={allMoleculesForChart}
              onMolClick={onSelectMol}
            />

            {/* Tabela de resultados embaixo — largura total */}
            <div className="rounded-xl border border-outline bg-panel p-4">
              <AdmetResultsTable
                molecules={molecules}
                total={molTotal}
                page={molPage}
                pages={molPages}
                filterBbb={filterBbb}
                filterHia={filterHia}
                onFilterBbb={onFilterBbb}
                onFilterHia={onFilterHia}
                onPageChange={onPageChange}
                onRowClick={onSelectMol}
                loading={molLoading}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modal de molécula */}
      {selectedMol && (
        <AdmetMoleculeModal molecule={selectedMol} onClose={onCloseMol} />
      )}
    </div>
  );
}
