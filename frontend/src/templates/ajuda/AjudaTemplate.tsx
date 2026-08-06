// templates/ajuda/AjudaTemplate.tsx
import { useState } from "react";
import { Navbar } from "../../components/layout";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  HelpIcon,
  SearchIcon,
  RefreshIcon,
  SettingsIcon,
  LogoutIcon,
} from "../../components/icons";
import type { UseAjudaPageReturn } from "../../pages/AjudaPage/useAjudaPage";
import type { CheckItemDH } from "../../data/usecases/config.usecase";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-outline bg-panel p-6 flex flex-col gap-4">
      <h2 className="text-[13px] font-semibold text-foreground-muted uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-accent-12 border border-accent-25 flex items-center justify-center">
        <span className="text-[12px] font-bold text-accent">{n}</span>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 pt-0.5">
        <span className="text-[13px] font-semibold text-foreground">{title}</span>
        <div className="text-[12px] text-foreground-subtle leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="font-mono text-[11px] bg-surface-secondary border border-outline rounded px-1.5 py-0.5 text-foreground-muted">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="font-mono text-[11px] bg-surface-secondary border border-outline rounded-lg px-4 py-3 text-foreground-muted overflow-x-auto leading-relaxed">
      {children}
    </pre>
  );
}

function OsTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 text-[12px] font-medium rounded-t-lg border-none cursor-pointer transition-colors ${
        active
          ? "bg-panel text-foreground border border-outline border-b-panel -mb-px"
          : "bg-surface-secondary text-foreground-subtle hover:text-foreground border border-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function CheckRow({ check }: { check: CheckItemDH }) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 flex flex-col gap-1 ${
        check.ok
          ? "border-accent-25 bg-accent-12"
          : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{check.ok ? "✅" : "❌"}</span>
        <span className="text-[13px] font-medium text-foreground">{check.nome}</span>
      </div>
      <p className="text-[11px] font-mono text-foreground-subtle pl-6">{check.mensagem}</p>
      {!check.ok && check.como_corrigir && (
        <p className="text-[12px] text-foreground-subtle pl-6 mt-0.5 leading-relaxed">
          <span className="font-medium text-foreground-muted">Como corrigir: </span>
          {check.como_corrigir}
        </p>
      )}
    </div>
  );
}

export default function AjudaTemplate({
  isAdmin,
  irParaBusca,
  irParaRedocking,
  irParaConfiguracoes,
  handleLogout,
  validando,
  checks,
  erroValidacao,
  handleValidar,
}: UseAjudaPageReturn) {
  const [osTab, setOsTab] = useState<"linux" | "windows">("linux");

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar className="select-none">
        <Navbar.Left>
          <span className="text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5">
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </span>
          <span className="ml-1 border-l border-outline pl-3 text-[13px] text-foreground-subtle inline-flex items-center gap-1.5">
            <HelpIcon size={13} />
            Ajuda
          </span>
        </Navbar.Left>

        <Navbar.Right>
          <button
            type="button"
            onClick={irParaBusca}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Busca
          </button>
          <button
            type="button"
            onClick={irParaRedocking}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Redocking
          </button>
          <button
            type="button"
            onClick={irParaConfiguracoes}
            className="cursor-pointer rounded border-none bg-transparent px-3 py-1.5 font-mono text-[12px] text-foreground-subtle transition-colors hover:text-foreground"
          >
            Configurações
          </button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Sair
          </Button>
        </Navbar.Right>
      </Navbar>

      <main className="flex-1 max-w-3xl w-full mx-auto px-8 py-10 flex flex-col gap-6 fade-in">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
            Guia de Instalação
          </h1>
          <p className="text-[13px] text-foreground-subtle">
            Siga os passos abaixo para instalar e configurar o DrugHunter antes de usar o PDB Explorer.
          </p>
        </div>

        {/* Seletor de OS */}
        <div className="flex gap-1 border-b border-outline">
          <OsTab active={osTab === "linux"} label="Linux" onClick={() => setOsTab("linux")} />
          <OsTab active={osTab === "windows"} label="Windows" onClick={() => setOsTab("windows")} />
        </div>

        {/* ── Passos de instalação ── */}
        <Section title="Pré-requisitos">
          <p className="text-[12px] text-foreground-subtle leading-relaxed">
            Antes de começar, certifique-se de ter o <strong className="text-foreground-muted">Anaconda</strong> ou{" "}
            <strong className="text-foreground-muted">Miniconda</strong> instalado na sua máquina.
            Se não tiver, baixe em{" "}
            <span className="font-mono text-foreground-muted">anaconda.com/download</span>.
          </p>
        </Section>

        <Section title="Instalação do DrugHunter">
          <div className="flex flex-col gap-5">
            <Step n={1} title="Extrair o DrugHunter">
              Descompacte o arquivo <Code>.zip</Code> recebido em uma pasta chamada{" "}
              <Code>DrugHunter</Code>.
              {osTab === "linux" ? (
                <div className="mt-2">
                  Sugestão de local: <Code>~/Área de Trabalho/DrugHunter</Code>
                </div>
              ) : (
                <div className="mt-2">
                  Sugestão de local: <Code>C:\DrugHunter</Code>
                </div>
              )}
            </Step>

            <Step n={2} title="Criar a pasta apps/ e baixar as dependências">
              Dentro da pasta <Code>DrugHunter</Code>, crie uma subpasta chamada <Code>apps/</Code>{" "}
              e coloque dentro dela os três itens abaixo:
              <div className="flex flex-col gap-3 mt-3">
                <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-foreground-muted">
                    2.1 — UCSF Chimera
                  </span>
                  <p>
                    Baixe em{" "}
                    <span className="font-mono text-foreground-muted">
                      cgl.ucsf.edu/chimera/download.html
                    </span>
                    .
                  </p>
                  {osTab === "linux" ? (
                    <p>
                      Baixe o arquivo <Code>.bin</Code> e renomeie para <Code>chimera.bin</Code>.
                      Coloque em <Code>apps/chimera.bin</Code>.
                    </p>
                  ) : (
                    <p>
                      Baixe o instalador <Code>.exe</Code> e instale normalmente.
                      Anote o diretório de instalação (você precisará dele nas Configurações).
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-foreground-muted">
                    2.2 — Dock6
                  </span>
                  <p>
                    Baixe em{" "}
                    <span className="font-mono text-foreground-muted">
                      github.com/docking-org/dock6
                    </span>
                    .
                  </p>
                  {osTab === "linux" ? (
                    <p>
                      Coloque o executável compilado em <Code>apps/dock6</Code>.
                    </p>
                  ) : (
                    <p>
                      Instale manualmente e anote o caminho do diretório <Code>bin/</Code>.
                    </p>
                  )}
                </div>

                {osTab === "linux" && (
                  <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-foreground-muted">
                      2.3 — Anaconda (se ainda não instalado)
                    </span>
                    <p>
                      Baixe o instalador em{" "}
                      <span className="font-mono text-foreground-muted">anaconda.com/download</span>,
                      renomeie o arquivo para <Code>anaconda.sh</Code> e coloque em{" "}
                      <Code>apps/anaconda.sh</Code>.
                    </p>
                  </div>
                )}
              </div>
            </Step>

            <Step n={3} title="Criar o ambiente conda do DrugHunter">
              Abra um terminal dentro da pasta <Code>DrugHunter</Code> e execute:
              <CodeBlock>{"conda env create -f requirements.yml"}</CodeBlock>
              Isso cria o ambiente <Code>DH</Code> com todos os pacotes necessários.
            </Step>

            {osTab === "linux" ? (
              <Step n={4} title="Executar o instalador">
                Ainda dentro da pasta <Code>DrugHunter</Code>, execute:
                <CodeBlock>{"./install.sh"}</CodeBlock>
                O instalador configura o Chimera, Dock6 e demais dependências automaticamente.
              </Step>
            ) : (
              <Step n={4} title="Instalação manual (Windows)">
                No Windows, o <Code>install.sh</Code> não é compatível. Os itens dos passos 2.1,
                2.2 já foram instalados manualmente. Instale também o{" "}
                <strong className="text-foreground-muted">DMS</strong> conforme indicado na
                documentação interna do DrugHunter.
              </Step>
            )}

            <Step n={5} title="Configurar o PDB Explorer">
              Vá em{" "}
              <button
                type="button"
                onClick={irParaConfiguracoes}
                className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-accent underline underline-offset-2"
              >
                Configurações → DrugHunter
              </button>{" "}
              e preencha os campos:
              <div className="flex flex-col gap-2 mt-2">
                <div className="rounded-lg border border-outline bg-surface-secondary px-3 py-2.5 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-foreground-muted">
                    Caminho do DrugHunter
                  </span>
                  <p>
                    Caminho completo da pasta extraída. Para obter:{" "}
                    {osTab === "linux"
                      ? "abra um terminal dentro da pasta e execute "
                      : "abra o Explorer, navegue até a pasta, clique na barra de endereços e copie. Ou no terminal: "}
                    <Code>{osTab === "linux" ? "pwd" : "cd"}</Code>
                    {osTab === "linux" ? "." : " e copie o caminho."}
                  </p>
                  <CodeBlock>
                    {osTab === "linux"
                      ? "/home/<seu-usuario>/Área de Trabalho/DrugHunter"
                      : "C:\\Users\\<seu-usuario>\\DrugHunter"}
                  </CodeBlock>
                </div>
                <div className="rounded-lg border border-outline bg-surface-secondary px-3 py-2.5 flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-foreground-muted">
                    Executável Python (ambiente DH)
                  </span>
                  <p>
                    Caminho do Python dentro do ambiente <Code>DH</Code>. Para obter, execute no
                    terminal:
                  </p>
                  <CodeBlock>
                    {osTab === "linux"
                      ? "conda activate DH && which python"
                      : "conda activate DH\nwhere python"}
                  </CodeBlock>
                  <p>Exemplo do resultado esperado:</p>
                  <CodeBlock>
                    {osTab === "linux"
                      ? "/home/<seu-usuario>/progs/anaconda3/envs/DH/bin/python"
                      : "C:\\Users\\<seu-usuario>\\anaconda3\\envs\\DH\\python.exe"}
                  </CodeBlock>
                </div>
              </div>
            </Step>

            <Step n={6} title="Verificar a instalação">
              Use o botão abaixo para checar se tudo está configurado corretamente.
            </Step>
          </div>
        </Section>

        {/* ── Testar Configuração (admin only) ── */}
        {isAdmin ? (
          <Section title="Testar Configuração">
            <p className="text-[12px] text-foreground-subtle leading-relaxed">
              Clique no botão abaixo para verificar se o DrugHunter e suas ferramentas estão
              acessíveis. O resultado mostrará o que está OK e o que precisa ser corrigido.
            </p>
            <Button
              variant="ghost"
              onClick={handleValidar}
              disabled={validando}
              className="self-start px-4 py-2 text-[13px]"
            >
              {validando ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner style={{ width: 13, height: 13, borderWidth: 2 }} />
                  Verificando...
                </span>
              ) : (
                "Testar Configuração do DrugHunter"
              )}
            </Button>

            {erroValidacao && (
              <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20 px-4 py-3 text-[12px] text-foreground-subtle">
                {erroValidacao}
              </div>
            )}

            {checks && (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-foreground-muted">
                    Resultado:{" "}
                    {checks.filter((c) => c.ok).length}/{checks.length} itens OK
                  </span>
                  {checks.every((c) => c.ok) && (
                    <span className="text-[12px] text-accent font-medium">
                      Ambiente pronto para redocking ✓
                    </span>
                  )}
                </div>
                {checks.map((check, i) => (
                  <CheckRow key={i} check={check} />
                ))}
              </div>
            )}
          </Section>
        ) : (
          <Section title="Testar Configuração">
            <p className="text-[12px] text-foreground-subtle">
              O botão de teste de configuração está disponível apenas para administradores.
              Solicite ao administrador do sistema que execute a verificação.
            </p>
          </Section>
        )}
      </main>
    </div>
  );
}
