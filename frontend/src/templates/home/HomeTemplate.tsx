// templates/home/HomeTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  BioactivityIcon,
  ClockIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  PredictionIcon,
  ProteinTargetIcon,
  RefreshIcon,
  SettingsIcon,
} from "../../components/icons";
import type { UseHomePageReturn } from "../../pages/HomePage/useHomePage";

// ── Ícone de dinâmica molecular (placeholder futuro) ─────────────────────────
function DynamicsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M2 14 Q5 8 10 10 Q15 12 18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="2" cy="14" r="1.5" fill="currentColor" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
      <circle cx="18" cy="6" r="1.5" fill="currentColor" />
    </svg>
  );
}

// ── Seta de pipeline ─────────────────────────────────────────────────────────
function PipelineArrow() {
  return (
    <div className="flex items-center shrink-0" style={{ color: "var(--color-foreground-subtle)", opacity: 0.4 }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 9h12M11 5l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Card de módulo do pipeline ───────────────────────────────────────────────
interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  to?: string;
  disabled?: boolean;
  badge?: string;
}

function ModuleCard({ icon, title, description, to, disabled, badge }: ModuleCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5 flex-1 min-w-0 transition-all duration-150"
      style={{
        borderColor: disabled ? "var(--color-outline)" : "var(--color-outline)",
        background: disabled ? "transparent" : "var(--color-surface-secondary)",
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex items-center justify-center rounded-lg p-2"
          style={{
            background: disabled
              ? "color-mix(in srgb, var(--color-foreground-subtle) 8%, transparent)"
              : "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            color: disabled ? "var(--color-foreground-subtle)" : "var(--color-accent)",
          }}
        >
          {icon}
        </span>
        {badge && (
          <span
            className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: "color-mix(in srgb, var(--color-foreground-subtle) 10%, transparent)",
              color: "var(--color-foreground-subtle)",
            }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-bold text-foreground leading-tight">{title}</span>
        <span className="font-mono text-[11px] text-foreground-subtle leading-relaxed">{description}</span>
      </div>
      {!disabled && to && (
        <button
          type="button"
          onClick={() => navigate(to)}
          className="mt-auto cursor-pointer self-start rounded px-3 py-1.5 font-mono text-[12px] font-medium transition-colors border"
          style={{
            color: "var(--color-accent)",
            borderColor: "color-mix(in srgb, var(--color-accent) 30%, transparent)",
            background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--color-accent) 16%, transparent)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--color-accent) 8%, transparent)";
          }}
        >
          Acessar →
        </button>
      )}
    </div>
  );
}

// ── Badge de status do ambiente ──────────────────────────────────────────────
function AmbienteBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ background: ok ? "var(--color-green)" : "var(--color-red)" }}
      />
      <span className="font-mono text-[12px] text-foreground-muted">{label}</span>
      <span
        className="ml-auto font-mono text-[11px]"
        style={{ color: ok ? "var(--color-green)" : "var(--color-red)" }}
      >
        {ok ? "ok" : "não configurado"}
      </span>
    </div>
  );
}

// ── Linha de atividade ───────────────────────────────────────────────────────
function AtividadeRow({
  label,
  valor,
  data,
  extra,
  vazio,
}: {
  label: string;
  valor?: string | null;
  data?: string | null;
  extra?: string;
  vazio?: boolean;
}) {
  const dataFormatada = data
    ? new Date(data).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-0.5 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-outline)" }}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-foreground-subtle">{label}</span>
      {vazio || !valor ? (
        <span className="font-mono text-[12px] text-foreground-subtle italic">— nenhuma atividade</span>
      ) : (
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-foreground truncate">{valor}</span>
          {extra && (
            <span className="font-mono text-[11px] text-foreground-subtle">{extra}</span>
          )}
          {dataFormatada && (
            <span className="font-mono text-[11px] text-foreground-subtle ml-auto">{dataFormatada}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Template principal ───────────────────────────────────────────────────────
export default function HomeTemplate({ userName, status, loading, handleLogout }: UseHomePageReturn) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const amb = status?.ambiente;
  const atv = status?.atividade;

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5 select-none">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
        </Navbar.Left>

        <Navbar.Middle>
          <MiddleBar activeModule={null} />
        </Navbar.Middle>

        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={() => setMenuAberto((v) => !v)}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<RefreshIcon size={14} />}
              label="Redocking"
              onClick={() => { setMenuAberto(false); navigate("/redocking"); }}
              divider
            />
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

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-8 py-10 flex flex-col gap-10">
        {/* Saudação */}
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-extrabold text-foreground tracking-tight">
            Olá, {userName}
          </h1>
          <p className="font-mono text-[13px] text-foreground-subtle">
            Pipeline de descoberta de fármacos assistida por computador
          </p>
        </div>

        {/* Pipeline de módulos */}
        <section className="flex flex-col gap-4">
          <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
            Módulos
          </span>
          <div className="flex items-stretch gap-2">
            <ModuleCard
              icon={<ProteinTargetIcon size={20} />}
              title="Proteínas-Alvo"
              description="Busca e baixa estruturas proteicas do RCSB PDB para uso no pipeline."
              to="/busca-pdb"
            />
            <PipelineArrow />
            <ModuleCard
              icon={<BioactivityIcon size={20} />}
              title="Bioatividade"
              description="Scraping de compostos bioativos no ChEMBL e análise de fingerprints moleculares."
              to="/chembl"
            />
            <PipelineArrow />
            <ModuleCard
              icon={<PredictionIcon size={20} />}
              title="Predição"
              description="Predição de atividade de compostos ZINC via modelo de consenso treinado."
              disabled
              badge="Em breve"
            />
            <PipelineArrow />
            <ModuleCard
              icon={<DynamicsIcon size={20} />}
              title="Dinâmica Molecular"
              description="Simulação de dinâmica molecular e análise de trajetórias."
              disabled
              badge="Futuro"
            />
          </div>
        </section>

        {/* Linha inferior: atividade + ambiente */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_300px]">
          {/* Atividade recente */}
          <section className="flex flex-col gap-3 rounded-xl border border-outline bg-panel p-5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
              Atividade recente
            </span>
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner style={{ width: 22, height: 22, borderWidth: 2 }} />
              </div>
            ) : (
              <div className="flex flex-col">
                <AtividadeRow
                  label="Última busca — Proteínas-Alvo"
                  valor={atv?.ultima_busca_pdb?.query}
                  data={atv?.ultima_busca_pdb?.data}
                  extra={
                    atv?.ultima_busca_pdb?.total != null
                      ? `${atv.ultima_busca_pdb.total} resultados`
                      : undefined
                  }
                />
                <AtividadeRow
                  label="Última execução — Bioatividade"
                  valor={atv?.ultimo_chembl?.target}
                  data={atv?.ultimo_chembl?.data}
                  extra={atv?.ultimo_chembl?.status ?? undefined}
                />
                <AtividadeRow
                  label="Último redocking"
                  valor={atv?.ultimo_redocking?.target}
                  data={atv?.ultimo_redocking?.data}
                  extra={atv?.ultimo_redocking?.status ?? undefined}
                />
              </div>
            )}
          </section>

          {/* Status do ambiente */}
          <section className="flex flex-col gap-3 rounded-xl border border-outline bg-panel p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-foreground-subtle">
                Ambiente
              </span>
              <button
                type="button"
                onClick={() => navigate("/configuracoes")}
                className="cursor-pointer rounded border-none bg-transparent font-mono text-[11px] text-foreground-subtle hover:text-foreground transition-colors"
              >
                Configurar →
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Spinner style={{ width: 22, height: 22, borderWidth: 2 }} />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <AmbienteBadge label="DrugHunter" ok={amb?.drug_hunter ?? false} />
                <AmbienteBadge label="Python" ok={amb?.python ?? false} />
                <AmbienteBadge label="Notificações SMTP" ok={amb?.smtp ?? false} />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
