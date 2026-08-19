// templates/chembl/ChemblTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  BioactivityIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  RefreshIcon,
  SettingsIcon,
} from "../../components/icons";
import { ChemblConfigForm } from "../../components/chembl/ChemblConfigForm";
import type { UseChemblPageReturn } from "../../pages/ChemblPage/useChemblPage";
import type { ChemblJobModel } from "../../domain/models/chembl.model";

function JobHistoryCard({
  job,
  onClick,
  onDelete,
}: {
  job: ChemblJobModel;
  onClick: () => void;
  onDelete: () => void;
}) {
  const date = new Date(job.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const statusColor =
    job.status === "done"
      ? "var(--color-green)"
      : job.status === "error"
        ? "var(--color-red)"
        : "var(--color-accent)";
  const statusLabel =
    job.status === "done" ? "concluído" : job.status === "error" ? "erro" : "em andamento";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left rounded-lg border border-outline p-3 transition-all hover:border-outline-strong hover:bg-panel"
      >
        <div className="flex items-center gap-2 pr-5">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ background: statusColor }}
          />
          <span className="font-mono text-[12px] text-foreground truncate flex-1">
            {job.items.map((it) => it.target_name).join(", ")}
          </span>
          <span className="font-mono text-[10px] text-foreground-subtle shrink-0">{date}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[10px] text-foreground-subtle">
            {job.items.length} alvo(s)
          </span>
          <span
            className="font-mono text-[10px]"
            style={{ color: statusColor }}
          >
            · {statusLabel}
          </span>
          {job.status === "running" && (
            <Spinner style={{ width: 10, height: 10, borderWidth: 1.5 }} />
          )}
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-1.5 right-1.5 flex items-center justify-center rounded w-5 h-5 font-mono text-[12px] text-foreground-subtle hover:text-foreground transition-colors"
        title="Remover do histórico"
      >
        ×
      </button>
    </div>
  );
}

export default function ChemblTemplate(props: UseChemblPageReturn) {
  const {
    items, baseOutputPath, setBaseOutputPath,
    onItemChange, onItemRemove, onAddItem,
    submitting, submitError, onRunGrupo,
    jobs, jobsLoading, onDeleteJob,
    historyPage, historyTotalPages, onHistoryPageChange,
    handleLogout,
  } = props;

  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const canRun = items.some((it) => it.target_names.some((t) => t.trim())) && !submitting;

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="cursor-pointer rounded border-none bg-transparent p-[4px_6px] text-foreground-subtle transition-colors hover:text-foreground"
            title="Início"
          >
            <AppLogoIcon size={17} />
          </button>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            PDB<b className="text-foreground font-extrabold">Explorer</b>
            <span className="mx-1 text-outline">/</span>
            <BioactivityIcon size={15} className="text-foreground-subtle" />
            <span className="text-foreground-subtle">Bioatividade</span>
          </span>
        </Navbar.Left>

        <Navbar.Middle>
          <MiddleBar activeModule="chembl" />
        </Navbar.Middle>

        <Navbar.Right>
          <button
            type="button"
            onClick={() => navigate("/redocking")}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Redocking
          </button>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => { setMenuAberto(false); navigate("/configuracoes"); }}
              divider
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={() => { setMenuAberto(false); navigate("/ajuda"); }}
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

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Formulário */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[20px] font-extrabold text-foreground tracking-tight">
              Grupo de execução ChEMBL
            </h1>
            <p className="font-mono text-[12px] text-foreground-subtle">
              Cada grupo compartilha a mesma configuração. Adicione quantos alvos quiser em cada grupo.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddItem}
            className="cursor-pointer flex items-center gap-1.5 rounded border border-outline px-3 py-1.5 font-mono text-[12px] text-foreground-subtle hover:text-foreground hover:border-outline-strong transition-colors"
          >
            + Novo grupo
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-outline bg-panel px-4 py-3">
          <span className="font-mono text-[12px] text-foreground-subtle w-[120px] shrink-0">
            Pasta de saída
          </span>
          <input
            type="text"
            value={baseOutputPath}
            onChange={(e) => setBaseOutputPath(e.target.value)}
            placeholder="/home/usuaria/DrugHunter/output"
            className="flex-1 rounded border border-outline bg-surface-secondary px-3 py-1.5 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-outline-strong"
          />
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, idx) => (
            <ChemblConfigForm
              key={item.id}
              item={item}
              index={idx}
              onChange={onItemChange}
              onRemove={onItemRemove}
              canRemove={items.length > 1}
            />
          ))}
        </div>

        {submitError && (
          <p className="font-mono text-[12px] select-text" style={{ color: "var(--color-red)" }}>
            {submitError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRunGrupo}
            disabled={!canRun}
            className="cursor-pointer flex items-center gap-2 rounded px-6 py-2.5 font-mono text-[14px] font-bold transition-colors disabled:opacity-40"
            style={{
              background: "var(--color-accent)",
              color: "var(--color-surface-primary)",
            }}
          >
            {submitting ? (
              <>
                <Spinner style={{ width: 14, height: 14, borderWidth: 2, borderColor: "currentColor", borderTopColor: "transparent" }} />
                Iniciando...
              </>
            ) : (
              "Executar grupo →"
            )}
          </button>
        </div>

        {/* Histórico */}
        <section className="flex flex-col gap-3">
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
            Histórico
          </span>
          {jobsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner style={{ width: 20, height: 20, borderWidth: 2 }} />
            </div>
          ) : jobs.length === 0 ? (
            <span className="font-mono text-[12px] text-foreground-subtle italic">
              Nenhuma execução salva.
            </span>
          ) : (
            <div className="flex flex-col gap-2">
              {jobs.slice((historyPage - 1) * 8, historyPage * 8).map((job) => (
                <JobHistoryCard
                  key={job.id}
                  job={job}
                  onClick={() => navigate(`/chembl/${job.id}/resultados`)}
                  onDelete={() => onDeleteJob(job.id)}
                />
              ))}
              {historyTotalPages > 1 && (
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => onHistoryPageChange(historyPage - 1)}
                    disabled={historyPage === 1}
                    className="cursor-pointer rounded border border-outline px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                  >
                    ←
                  </button>
                  <span className="font-mono text-[11px] text-foreground-subtle">
                    {historyPage}/{historyTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => onHistoryPageChange(historyPage + 1)}
                    disabled={historyPage === historyTotalPages}
                    className="cursor-pointer rounded border border-outline px-2 py-0.5 font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
