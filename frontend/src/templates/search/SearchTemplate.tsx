// templates/search/SearchTemplate.tsx
import type { RefObject } from "react";
import DashboardTemplate from "../dashboard/DashboardTemplate";
import { Button } from "../../components/ui/Button";
import { SearchBox } from "../../components/ui/searchbox";
import { ProgressCard } from "../../components/search/ProgressCard";
import { DropdownMenu, Navbar } from "../../components/layout";
import {
  AppLogoIcon,
  ClockIcon,
  CloseIcon,
  LogoutIcon,
  MenuIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  SearchIcon,
  WarningIcon,
} from "../../components/icons";
import type { UserModel } from "../../domain/models/auth.model";
import type { PdbResultModel } from "../../domain/models/search.model";
import type { UseDashboardReturn } from "../../hooks/useDashboard";

interface SearchTemplateProps {
  user: UserModel | null;
  input: string;
  setInput: (v: string) => void;
  fase: "idle" | "buscando" | "pausado" | "resultado";
  resultados: PdbResultModel[];
  erroMsg: string;
  proteinas: string[];
  pausado: boolean;
  barraRef: RefObject<HTMLDivElement | null>;
  pctTextoRef: RefObject<HTMLSpanElement | null>;
  contadorRef: RefObject<HTMLSpanElement | null>;
  labelRef: RefObject<HTMLSpanElement | null>;
  coletadasRef: RefObject<HTMLElement | null>;
  protAtualRef: RefObject<HTMLElement | null>;
  menuAberto: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  handleLogout: () => void;
  toggleMenu: () => void;
  irParaHistorico: () => void;
  togglePausa: () => void;
  cancelar: () => void;
  iniciarBusca: (forcarNovo?: boolean) => void;
  resetBusca: () => void;
  dashboard: UseDashboardReturn;
}

export default function SearchTemplate({
  user,
  input,
  setInput,
  fase,
  resultados,
  erroMsg,
  proteinas,
  pausado,
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
  togglePausa,
  cancelar,
  iniciarBusca,
  resetBusca,
  dashboard,
}: SearchTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
        <Navbar.Left>
          <span className="inline-flex items-center gap-1.5 text-[17px] font-medium text-foreground-muted">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="font-extrabold text-foreground">Explorer</b>
          </span>
        </Navbar.Left>

        <Navbar.Right>
          <DropdownMenu
            isOpen={menuAberto}
            menuRef={menuRef}
            onToggle={toggleMenu}
            buttonTitle="Menu"
            trigger={<MenuIcon size={25} />}
          >
            <DropdownMenu.Item
              icon={<ClockIcon size={14} />}
              label="Histórico"
              onClick={irParaHistorico}
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

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-8 py-12">
        {fase !== "resultado" && (
          <div className="flex flex-col gap-4">
            {/* Cabeçalho de busca */}
            <div className="text-center mb-2">
              <h1 className="mb-2 text-[32px] font-extrabold tracking-tight text-foreground-muted">
                Buscar Proteínas
              </h1>
              <p className="font-mono text-[14px] text-foreground-subtle">
                Digite uma ou mais proteínas separadas por vírgula
              </p>
            </div>

            {/* Caixa de busca */}
            <SearchBox>
              <SearchBox.TextArea
                value={input}
                onChange={setInput}
                onSubmit={() => iniciarBusca()}
                placeholder={"glucan synthase\nFKS1, ERG11, Candida auris"}
                disabled={fase === "buscando" || fase === "pausado"}
              />
              <SearchBox.Footer>
                {fase === "idle" && (
                  <Button
                    variant="ghost"
                    onClick={() => iniciarBusca(true)}
                    disabled={!input.trim()}
                    className="px-4 py-2 text-[13px]"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshIcon size={13} /> Forçar novo
                    </span>
                  </Button>
                )}
                {(fase === "buscando" || fase === "pausado") && (
                  <>
                    <button
                      onClick={togglePausa}
                      className={`px-4 py-2 text-[13px] font-semibold rounded-lg cursor-pointer border transition-all ${
                        pausado
                          ? "bg-accent-15 border-accent-30 text-accent hover:bg-accent-25"
                          : "bg-yellow-15 border-yellow-30 text-yellow hover:bg-yellow-25"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {pausado ? (
                          <PlayIcon size={12} />
                        ) : (
                          <PauseIcon size={12} />
                        )}
                        {pausado ? "Retomar" : "Pausar"}
                      </span>
                    </button>
                    <button
                      onClick={cancelar}
                      className="cursor-pointer rounded-lg border-none bg-transparent px-3.5 py-2 text-[13px] font-semibold text-foreground-muted transition-colors hover:text-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CloseIcon size={12} /> Cancelar
                      </span>
                    </button>
                  </>
                )}
                {fase === "idle" && (
                  <Button
                    variant="primary"
                    onClick={() => iniciarBusca()}
                    disabled={!input.trim()}
                    className="px-6 py-2"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <SearchIcon size={13} /> Buscar
                    </span>
                  </Button>
                )}
              </SearchBox.Footer>
            </SearchBox>

            {/* Card de progresso */}
            {(fase === "buscando" || fase === "pausado") && (
              <ProgressCard
                pausado={pausado}
                proteinas={proteinas}
                labelRef={labelRef}
                contadorRef={contadorRef}
                pctTextoRef={pctTextoRef}
                barraRef={barraRef}
                coletadasRef={coletadasRef}
                protAtualRef={protAtualRef}
              />
            )}

            {erroMsg && (
              <div className="rounded-lg border border-red/20 bg-red/10 px-4 py-3.5 text-[14px] text-red">
                <span className="inline-flex items-center gap-1.5">
                  <WarningIcon size={14} /> {erroMsg}
                </span>
              </div>
            )}
          </div>
        )}

        {fase === "resultado" && (
          <DashboardTemplate
            {...dashboard}
            dados={resultados}
            proteinas={proteinas}
            onNovaBusca={resetBusca}
          />
        )}
      </main>
    </div>
  );
}
