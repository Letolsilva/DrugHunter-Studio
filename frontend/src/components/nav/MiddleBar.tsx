// components/nav/MiddleBar.tsx
import { Link, useLocation } from "react-router-dom";
import { ProteinTargetIcon, BioactivityIcon, DynamicsIcon } from "../icons";

type ActiveModule = "pdb" | "chembl" | "dynamics" | null;

interface MiddleBarProps {
  activeModule: ActiveModule;
}

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  tooltip?: string;
}

function NavItem({ to, icon, label, active, disabled, tooltip }: NavItemProps) {
  const base =
    "flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors select-none";
  const activeClass = "text-accent";
  const idleClass =
    "text-foreground-subtle hover:text-foreground cursor-pointer";
  const disabledClass = "text-foreground-subtle/40 cursor-default";

  const inner = (
    <div className={`${base} ${disabled ? disabledClass : active ? activeClass : idleClass}`}>
      {icon}
      <span className="text-[10px] font-semibold tracking-wider uppercase leading-none">
        {label}
      </span>
      <div
        className={`h-[2px] w-5 rounded-full transition-opacity ${active ? "bg-accent opacity-100" : "opacity-0"}`}
      />
    </div>
  );

  if (disabled) {
    return (
      <div title={tooltip} aria-label={tooltip}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={to!} className="no-underline">
      {inner}
    </Link>
  );
}

export function MiddleBar({ activeModule }: MiddleBarProps) {
  const location = useLocation();

  const isPdb =
    activeModule === "pdb" ||
    location.pathname === "/busca-pdb" ||
    location.pathname.startsWith("/historico") ||
    location.pathname.startsWith("/meus-pdbs") ||
    location.pathname.startsWith("/visualizador");

  const isChembl =
    activeModule === "chembl" ||
    location.pathname.startsWith("/chembl") ||
    location.pathname.startsWith("/admet") ||
    location.pathname.startsWith("/consensus") ||
    location.pathname.startsWith("/clustering") ||
    location.pathname.startsWith("/neurodock");

  const isDynamics =
    activeModule === "dynamics" ||
    location.pathname.startsWith("/dinamica-molecular");

  return (
    <div className="flex items-center gap-1">
      <NavItem
        to="/busca-pdb"
        icon={<ProteinTargetIcon size={18} />}
        label="Proteínas-Alvo"
        active={isPdb}
      />
      <NavItem
        to="/chembl"
        icon={<BioactivityIcon size={18} />}
        label="Bioatividade"
        active={isChembl}
      />
      <NavItem
        to="/dinamica-molecular"
        icon={<DynamicsIcon size={18} />}
        label="Din. Molecular"
        active={isDynamics}
      />
    </div>
  );
}
