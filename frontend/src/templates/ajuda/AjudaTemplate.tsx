// templates/ajuda/AjudaTemplate.tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import {
  AppLogoIcon,
  CopyIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  RefreshIcon,
  SettingsIcon,
} from "../../components/icons";
import type { UseAjudaPageReturn } from "../../pages/AjudaPage/useAjudaPage";
import type { CheckItemDH } from "../../data/usecases/config.usecase";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-outline bg-panel p-6 flex flex-col gap-4">
      <h2 className="text-[13px] font-semibold text-foreground-muted uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-7 h-7 rounded-full bg-accent-12 border border-accent-25 flex items-center justify-center">
        <span className="text-[12px] font-bold text-accent">{n}</span>
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0 pt-0.5">
        <span className="text-[13px] font-semibold text-foreground">
          {title}
        </span>
        <div className="text-[12px] text-foreground-subtle leading-relaxed">
          {children}
        </div>
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="relative group">
      <pre className="font-mono text-[11px] bg-surface-secondary border border-outline rounded-lg px-4 py-3 pr-10 text-foreground-muted overflow-x-auto leading-relaxed">
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded text-foreground-subtle hover:text-foreground hover:bg-outline/60 transition-colors opacity-0 group-hover:opacity-100"
        title={copied ? "Copiado!" : "Copiar comando"}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <CopyIcon size={12} />
        )}
      </button>
    </div>
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

function CheckRow({
  check,
  onAutoFix,
  autoFixando,
}: {
  check: CheckItemDH;
  onAutoFix?: () => void;
  autoFixando?: boolean;
}) {
  const isWarn = !check.ok && check.opcional;
  return (
    <div
      className={`rounded-lg border px-4 py-3 flex flex-col gap-1.5 ${
        check.ok
          ? "border-accent-25 bg-accent-12"
          : isWarn
            ? "border-yellow-400/40 bg-yellow-500/5"
            : "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-[14px]">{check.ok ? "✅" : isWarn ? "⚠️" : "❌"}</span>
        <span className="text-[13px] font-medium text-foreground">
          {check.nome}
        </span>
        {check.opcional && (
          <span className="text-[10px] font-mono text-foreground-subtle border border-outline rounded-full px-2 py-0.5 ml-1">
            opcional
          </span>
        )}
      </div>
      <p className="text-[11px] font-mono text-foreground-subtle pl-6">
        {check.mensagem}
      </p>
      {!check.ok && check.como_corrigir && (
        <p className="text-[12px] text-foreground-subtle pl-6 mt-0.5 leading-relaxed">
          <span className="font-medium text-foreground-muted">
            {check.opcional ? "Como instalar: " : "Como corrigir: "}
          </span>
          {check.como_corrigir}
        </p>
      )}
      {!check.ok && onAutoFix && (
        <div className="pl-6 mt-1">
          <button
            type="button"
            onClick={onAutoFix}
            disabled={autoFixando}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-[12px] font-medium bg-surface-secondary border border-outline text-foreground-muted hover:text-foreground hover:border-foreground-subtle transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {autoFixando ? (
              <>
                <Spinner style={{ width: 11, height: 11, borderWidth: 2 }} />
                Corrigindo...
              </>
            ) : (
              "Corrigir automaticamente"
            )}
          </button>
        </div>
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
  corrigindoBson,
  handleCorrigirBson,
}: UseAjudaPageReturn) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [osTab, setOsTab] = useState<"linux" | "windows">("linux");

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar className="select-none">
        <Navbar.Left>
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="cursor-pointer rounded border-none bg-transparent text-[17px] font-medium text-foreground-muted inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
            title="Início"
          >
            <AppLogoIcon size={17} className="text-foreground-muted" />
            PDB<b className="text-foreground font-extrabold">Explorer</b>
          </button>
          <span className="ml-1 border-l border-outline pl-3 text-[13px] text-foreground-subtle inline-flex items-center gap-1.5">
            <HelpIcon size={13} />
            Ajuda
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
              onClick={() => {
                setMenuAberto(false);
                irParaRedocking();
              }}
              divider
            />
            <DropdownMenu.Item
              icon={<SettingsIcon size={14} />}
              label="Configurações"
              onClick={() => {
                setMenuAberto(false);
                irParaConfiguracoes();
              }}
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

      <main className="flex-1 max-w-3xl w-full mx-auto px-8 py-10 flex flex-col gap-6 fade-in">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
            Guia de Instalação
          </h1>
          <p className="text-[13px] text-foreground-subtle">
            Siga os passos abaixo para instalar e configurar o DrugHunter.
            Após concluir, use o botão "Verificar instalação" para confirmar
            que tudo está pronto.
          </p>
        </div>

        {/* Seletor de OS */}
        <div className="flex gap-1 border-b border-outline">
          <OsTab
            active={osTab === "linux"}
            label="Linux"
            onClick={() => setOsTab("linux")}
          />
          <OsTab
            active={osTab === "windows"}
            label="Windows"
            onClick={() => setOsTab("windows")}
          />
        </div>

        {/* ── Passos de instalação ── */}
        <Section title="Instalação do DrugHunter">
          <div className="flex flex-col gap-5">

            {osTab === "linux" ? (
              <>
                {/* ══════════════ LINUX ══════════════ */}

                <Step n={1} title="Extrair o DrugHunter">
                  <p>
                    Descompacte o arquivo <Code>.zip</Code> recebido. O
                    resultado deve ser uma pasta chamada{" "}
                    <Code>DrugHunter</Code>. Sugestão de local:
                  </p>
                  <CodeBlock>{"~/Área de Trabalho/DrugHunter"}</CodeBlock>
                </Step>

                <Step n={2} title="Criar a pasta apps/ e preparar as dependências">
                  <p>
                    Dentro da pasta <Code>DrugHunter</Code>, crie uma subpasta
                    chamada <Code>apps/</Code>. Você precisará colocar três
                    arquivos dentro dela:
                  </p>
                  <div className="flex flex-col gap-3 mt-3">

                    {/* 2.1 Chimera */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground-muted">
                        2.1 — UCSF Chimera (obrigatório)
                      </span>
                      <p>
                        Acesse{" "}
                        <span className="font-mono text-foreground-muted">
                          cgl.ucsf.edu/chimera/download.html
                        </span>
                        , faça o cadastro gratuito (licença acadêmica) e
                        baixe o instalador Linux (<Code>.bin</Code>).
                      </p>
                      <p>
                        Renomeie o arquivo baixado para{" "}
                        <Code>chimera.bin</Code> e mova para dentro de{" "}
                        <Code>DrugHunter/apps/</Code>. O instalador do passo
                        3 irá executá-lo automaticamente.
                      </p>
                    </div>

                    {/* 2.2 Anaconda */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground-muted">
                        2.2 — Anaconda (obrigatório)
                      </span>
                      <p>
                        Verifique se já tem o conda instalado abrindo um
                        terminal e digitando:
                      </p>
                      <CodeBlock>{"conda --version"}</CodeBlock>
                      <p>
                        Se aparecer a versão, você já tem o conda — pule
                        para o item 2.3. Caso contrário, baixe o instalador
                        Linux em{" "}
                        <span className="font-mono text-foreground-muted">
                          anaconda.com/download
                        </span>
                        , salve o arquivo como <Code>anaconda.sh</Code> e
                        coloque dentro de <Code>DrugHunter/apps/</Code>. O
                        instalador do passo 3 cuidará do resto.
                      </p>
                    </div>

                    {/* 2.3 Dock6 */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground-muted">
                        2.3 — Dock6 (obrigatório para o módulo de Consenso)
                      </span>
                      <p>
                        O Dock6 precisa ser instalado manualmente. Acesse{" "}
                        <span className="font-mono text-foreground-muted">
                          github.com/docking-org/dock6
                        </span>{" "}
                        e siga as instruções de compilação do repositório.
                      </p>
                      <p>
                        Após instalar, anote o caminho completo da pasta{" "}
                        <Code>bin/</Code> do Dock6 — você precisará dele nas
                        Configurações. Se os binários (<Code>dock6</Code>,{" "}
                        <Code>sphgen</Code>, <Code>grid</Code>) estiverem no
                        PATH do sistema, o PDB Explorer detecta
                        automaticamente.
                      </p>
                    </div>

                  </div>
                </Step>

                <Step n={3} title="Criar o ambiente conda do DrugHunter">
                  <p>
                    Abra um terminal dentro da pasta <Code>DrugHunter</Code>{" "}
                    (clique com o botão direito na pasta → "Abrir terminal
                    aqui") e execute:
                  </p>
                  <CodeBlock>{"conda env create -f requirements.yml"}</CodeBlock>
                  <p>
                    Isso instala todos os pacotes científicos e cria o
                    ambiente chamado <Code>DrugHunter</Code>. Pode levar{" "}
                    <strong className="text-foreground-muted">
                      10 a 30 minutos
                    </strong>{" "}
                    dependendo da sua conexão. Aguarde a mensagem de
                    conclusão antes de continuar.
                  </p>
                  <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 mt-1 text-[12px] text-foreground-subtle">
                    <strong className="text-foreground-muted">Conda não encontrado?</strong>{" "}
                    Se o terminal exibir "conda: command not found", feche e
                    reabra o terminal (ou abra um novo) e tente novamente.
                    Se ainda assim não funcionar, execute primeiro:{" "}
                    <Code>bash apps/anaconda.sh</Code> e siga as instruções,
                    depois feche e reabra o terminal.
                  </div>
                </Step>

                <Step n={4} title="Executar o instalador">
                  <p>
                    Antes de rodar o instalador, garanta que o sistema tem
                    as ferramentas de compilação necessárias:
                  </p>
                  <CodeBlock>{"sudo apt install build-essential wget unzip"}</CodeBlock>
                  <p className="mt-2">
                    Agora, ainda dentro da pasta <Code>DrugHunter</Code>,
                    execute:
                  </p>
                  <CodeBlock>{"./install.sh"}</CodeBlock>
                  <p>
                    O instalador irá: instalar o UCSF Chimera a partir do{" "}
                    <Code>apps/chimera.bin</Code>, e baixar, compilar e
                    instalar o DMS (ferramenta usada pelo Dock6 para mapear
                    a superfície da proteína). Pode levar{" "}
                    <strong className="text-foreground-muted">
                      5 a 15 minutos
                    </strong>
                    . Aguarde até o terminal retornar ao cursor.
                  </p>
                  <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 mt-2 text-[12px] text-foreground-subtle leading-relaxed">
                    <strong className="text-foreground-muted">
                      Aviso esperado:
                    </strong>{" "}
                    Durante a execução você verá a mensagem{" "}
                    <Code>install_dock6: command not found</Code>. Isso é
                    normal — o Dock6 precisa ser instalado manualmente
                    (passo 2.3) e o instalador continua normalmente após
                    essa mensagem. Não interrompa o processo.
                  </div>
                </Step>

                <Step n={5} title="Ferramentas adicionais para Dinâmica Molecular">
                  <p className="mb-3">
                    Ative o ambiente DrugHunter antes de instalar qualquer
                    uma das ferramentas abaixo:
                  </p>
                  <CodeBlock>{"conda activate DrugHunter"}</CodeBlock>

                  <div className="flex flex-col gap-4 mt-2">
                    {/* Kaleido */}
                    <div className="rounded-lg border border-red-300/40 bg-red-500/5 dark:border-red-800/40 px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-foreground-muted">
                          5.1 — Kaleido
                        </span>
                        <span className="text-[10px] text-red-500 dark:text-red-400 rounded-full border border-red-300/40 bg-red-500/10 px-2 py-0.5">
                          obrigatório para ver os gráficos
                        </span>
                      </div>
                      <p>
                        Gera os gráficos ao final da análise de trajetória
                        (RMSD, RMSF, etc.). Sem ele, a análise termina
                        normalmente mas{" "}
                        <strong className="text-foreground-muted">
                          nenhum gráfico é gerado
                        </strong>
                        .
                      </p>
                      <CodeBlock>
                        {"pip install kaleido==0.2.1 --force-reinstall"}
                      </CodeBlock>
                      <p className="text-foreground-muted font-medium text-[11px]">
                        Para confirmar que funcionou:
                      </p>
                      <CodeBlock>
                        {"python -c \"import kaleido; print('OK')\""}
                      </CodeBlock>
                    </div>

                    {/* Open Babel */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-foreground-muted">
                          5.2 — Open Babel
                        </span>
                        <span className="text-[10px] text-foreground-subtle rounded-full border border-outline px-2 py-0.5">
                          opcional
                        </span>
                      </div>
                      <p>
                        Prepara o arquivo da molécula antes de iniciar a
                        simulação. Sem ele, o sistema usa uma alternativa
                        interna automaticamente — adequado para exploração,
                        mas para publicação científica recomendamos instalar.
                      </p>
                      <CodeBlock>
                        {"conda install -c conda-forge openbabel"}
                      </CodeBlock>
                      <p className="text-foreground-muted font-medium text-[11px]">
                        Para confirmar que funcionou:
                      </p>
                      <CodeBlock>{"obabel --version"}</CodeBlock>
                    </div>

                    {/* AmberTools */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-foreground-muted">
                          5.3 — AmberTools
                        </span>
                        <span className="text-[10px] text-foreground-subtle rounded-full border border-outline px-2 py-0.5">
                          opcional
                        </span>
                      </div>
                      <p>
                        Calcula propriedades elétricas da molécula com maior
                        precisão (AM1-BCC). Sem ele, o sistema usa um método
                        mais simples automaticamente — adequado para
                        exploração inicial, mas não recomendado para
                        publicação.
                      </p>
                      <CodeBlock>
                        {"conda install -c conda-forge ambertools"}
                      </CodeBlock>
                      <p className="text-foreground-muted font-medium text-[11px]">
                        Para confirmar que funcionou:
                      </p>
                      <CodeBlock>{"antechamber -h"}</CodeBlock>
                    </div>

                    <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-[12px] text-foreground-subtle leading-relaxed">
                      <strong className="text-foreground-muted">Resumo:</strong>{" "}
                      Kaleido é necessário para visualizar os gráficos da
                      análise de Dinâmica Molecular. Open Babel e AmberTools
                      melhoram a precisão da simulação mas o sistema funciona
                      sem eles — você verá ⚠️ na verificação indicando que a
                      alternativa automática está ativa.
                    </div>
                  </div>
                </Step>

                <Step n={6} title="Configurar o PDB Explorer">
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
                        Caminho completo da pasta extraída. Para obter,
                        abra um terminal dentro da pasta e execute:
                      </p>
                      <CodeBlock>{"pwd"}</CodeBlock>
                      <p>Exemplo:</p>
                      <CodeBlock>
                        {"/home/<seu-usuario>/Área de Trabalho/DrugHunter"}
                      </CodeBlock>
                    </div>
                    <div className="rounded-lg border border-outline bg-surface-secondary px-3 py-2.5 flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-foreground-muted">
                        Executável Python (ambiente DrugHunter)
                      </span>
                      <p>
                        Caminho do Python dentro do ambiente conda{" "}
                        <Code>DrugHunter</Code>. Para obter, execute:
                      </p>
                      <CodeBlock>
                        {"conda activate DrugHunter && which python"}
                      </CodeBlock>
                      <p>Exemplo do resultado esperado:</p>
                      <CodeBlock>
                        {"/home/<seu-usuario>/progs/anaconda3/envs/DrugHunter/bin/python"}
                      </CodeBlock>
                    </div>
                  </div>
                </Step>

                <Step n={7} title="Verificar a instalação">
                  Use o botão abaixo para checar se tudo está configurado
                  corretamente. O resultado mostrará o que está OK e o que
                  precisa ser corrigido.
                </Step>
              </>
            ) : (
              <>
                {/* ══════════════ WINDOWS ══════════════ */}

                <Step n={1} title="Instalar o Anaconda">
                  <p>
                    O DrugHunter precisa do Anaconda para criar e gerenciar
                    o ambiente científico. Verifique se já tem o conda:
                    abra um terminal e digite{" "}
                    <Code>conda --version</Code>. Se aparecer a versão,
                    pule para o passo 2.
                  </p>
                  <p className="mt-2">
                    Caso não tenha, baixe o instalador Windows em{" "}
                    <span className="font-mono text-foreground-muted">
                      anaconda.com/download
                    </span>{" "}
                    (<Code>.exe</Code>), execute-o e marque a opção{" "}
                    <strong className="text-foreground-muted">
                      "Add Anaconda to PATH"
                    </strong>{" "}
                    durante a instalação. Após concluir, abra o{" "}
                    <strong className="text-foreground-muted">
                      Anaconda Prompt
                    </strong>{" "}
                    pelo menu Iniciar para os próximos passos.
                  </p>
                </Step>

                <Step n={2} title="Extrair o DrugHunter">
                  <p>
                    Descompacte o arquivo <Code>.zip</Code> recebido. O
                    resultado deve ser uma pasta chamada{" "}
                    <Code>DrugHunter</Code>. Sugestão de local:
                  </p>
                  <CodeBlock>{"C:\\DrugHunter"}</CodeBlock>
                </Step>

                <Step n={3} title="Instalar as dependências manualmente">
                  <p>
                    Dentro da pasta <Code>DrugHunter</Code>, crie uma
                    subpasta chamada <Code>apps/</Code>. No Windows, cada
                    dependência precisa ser instalada manualmente:
                  </p>
                  <div className="flex flex-col gap-3 mt-3">

                    {/* 3.1 Chimera */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground-muted">
                        3.1 — UCSF Chimera (obrigatório)
                      </span>
                      <p>
                        Acesse{" "}
                        <span className="font-mono text-foreground-muted">
                          cgl.ucsf.edu/chimera/download.html
                        </span>
                        , faça o cadastro gratuito (licença acadêmica) e
                        baixe o instalador Windows (<Code>.exe</Code>).
                        Execute-o e instale normalmente. Anote o diretório
                        de instalação — você precisará dele nas
                        Configurações.
                      </p>
                    </div>

                    {/* 3.2 Dock6 */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground-muted">
                        3.2 — Dock6 (obrigatório para o módulo de Consenso)
                      </span>
                      <p>
                        Acesse{" "}
                        <span className="font-mono text-foreground-muted">
                          github.com/docking-org/dock6
                        </span>{" "}
                        e siga as instruções de compilação do repositório.
                        Após instalar, anote o caminho da pasta{" "}
                        <Code>bin/</Code> do Dock6 — você precisará dele nas
                        Configurações.
                      </p>
                    </div>

                    {/* 3.3 DMS */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-foreground-muted">
                        3.3 — DMS (obrigatório para o módulo de Consenso)
                      </span>
                      <p>
                        O código-fonte do DMS já vem dentro de{" "}
                        <Code>DrugHunter/apps/dms/</Code>. Abra um terminal
                        nessa pasta e execute:
                      </p>
                      <CodeBlock>{"make"}</CodeBlock>
                      <p>
                        Após compilar, adicione o executável{" "}
                        <Code>dms.exe</Code> gerado ao PATH do Windows (por
                        exemplo, mova-o para{" "}
                        <Code>C:\Windows\System32</Code>). Em caso de
                        dúvida, consulte o suporte.
                      </p>
                    </div>

                  </div>
                </Step>

                <Step n={4} title="Criar o ambiente conda do DrugHunter">
                  <p>
                    Abra o <strong className="text-foreground-muted">Anaconda Prompt</strong>{" "}
                    e navegue até a pasta do DrugHunter:
                  </p>
                  <CodeBlock>{"cd C:\\DrugHunter"}</CodeBlock>
                  <p>Em seguida execute:</p>
                  <CodeBlock>{"conda env create -f requirements.yml"}</CodeBlock>
                  <p>
                    Isso instala todos os pacotes científicos e cria o
                    ambiente chamado <Code>DrugHunter</Code>. Pode levar{" "}
                    <strong className="text-foreground-muted">
                      10 a 30 minutos
                    </strong>{" "}
                    dependendo da sua conexão. Aguarde a mensagem de
                    conclusão antes de continuar.
                  </p>
                </Step>

                <Step n={5} title="Ferramentas adicionais para Dinâmica Molecular">
                  <p className="mb-3">
                    Abra o Anaconda Prompt e ative o ambiente DrugHunter
                    antes de instalar qualquer uma das ferramentas abaixo:
                  </p>
                  <CodeBlock>{"conda activate DrugHunter"}</CodeBlock>

                  <div className="flex flex-col gap-4 mt-2">
                    {/* Kaleido */}
                    <div className="rounded-lg border border-red-300/40 bg-red-500/5 dark:border-red-800/40 px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-foreground-muted">
                          5.1 — Kaleido
                        </span>
                        <span className="text-[10px] text-red-500 dark:text-red-400 rounded-full border border-red-300/40 bg-red-500/10 px-2 py-0.5">
                          obrigatório para ver os gráficos
                        </span>
                      </div>
                      <p>
                        Gera os gráficos ao final da análise de trajetória
                        (RMSD, RMSF, etc.). Sem ele, a análise termina
                        normalmente mas{" "}
                        <strong className="text-foreground-muted">
                          nenhum gráfico é gerado
                        </strong>
                        .
                      </p>
                      <CodeBlock>
                        {"pip install kaleido==0.2.1 --force-reinstall"}
                      </CodeBlock>
                      <p className="text-foreground-muted font-medium text-[11px]">
                        Para confirmar que funcionou:
                      </p>
                      <CodeBlock>
                        {"python -c \"import kaleido; print('OK')\""}
                      </CodeBlock>
                    </div>

                    {/* Open Babel */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-foreground-muted">
                          5.2 — Open Babel
                        </span>
                        <span className="text-[10px] text-foreground-subtle rounded-full border border-outline px-2 py-0.5">
                          opcional
                        </span>
                      </div>
                      <p>
                        Prepara o arquivo da molécula antes de iniciar a
                        simulação. Sem ele, o sistema usa uma alternativa
                        interna automaticamente — adequado para exploração,
                        mas para publicação científica recomendamos instalar.
                      </p>
                      <CodeBlock>
                        {"conda install -c conda-forge openbabel"}
                      </CodeBlock>
                      <p className="text-foreground-muted font-medium text-[11px]">
                        Para confirmar que funcionou:
                      </p>
                      <CodeBlock>{"obabel --version"}</CodeBlock>
                    </div>

                    {/* AmberTools */}
                    <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] font-semibold text-foreground-muted">
                          5.3 — AmberTools
                        </span>
                        <span className="text-[10px] text-foreground-subtle rounded-full border border-outline px-2 py-0.5">
                          opcional
                        </span>
                      </div>
                      <p>
                        Calcula propriedades elétricas da molécula com maior
                        precisão (AM1-BCC). Sem ele, o sistema usa um método
                        mais simples automaticamente — adequado para
                        exploração inicial, mas não recomendado para
                        publicação.
                      </p>
                      <CodeBlock>
                        {"conda install -c conda-forge ambertools"}
                      </CodeBlock>
                      <p className="text-foreground-muted font-medium text-[11px]">
                        Para confirmar que funcionou:
                      </p>
                      <CodeBlock>{"antechamber -h"}</CodeBlock>
                    </div>

                    <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 text-[12px] text-foreground-subtle leading-relaxed">
                      <strong className="text-foreground-muted">Resumo:</strong>{" "}
                      Kaleido é necessário para visualizar os gráficos da
                      análise de Dinâmica Molecular. Open Babel e AmberTools
                      melhoram a precisão da simulação mas o sistema funciona
                      sem eles — você verá ⚠️ na verificação indicando que a
                      alternativa automática está ativa.
                    </div>
                  </div>
                </Step>

                <Step n={6} title="Configurar o PDB Explorer">
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
                        Caminho completo da pasta extraída. No Explorer,
                        navegue até a pasta, clique na barra de endereços e
                        copie. Ou no Anaconda Prompt:
                      </p>
                      <CodeBlock>{"cd C:\\DrugHunter"}</CodeBlock>
                      <p>Exemplo:</p>
                      <CodeBlock>
                        {"C:\\Users\\<seu-usuario>\\DrugHunter"}
                      </CodeBlock>
                    </div>
                    <div className="rounded-lg border border-outline bg-surface-secondary px-3 py-2.5 flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-foreground-muted">
                        Executável Python (ambiente DrugHunter)
                      </span>
                      <p>
                        Caminho do Python dentro do ambiente conda{" "}
                        <Code>DrugHunter</Code>. Para obter, no Anaconda
                        Prompt execute:
                      </p>
                      <CodeBlock>
                        {"conda activate DrugHunter\nwhere python"}
                      </CodeBlock>
                      <p>Exemplo do resultado esperado:</p>
                      <CodeBlock>
                        {"C:\\Users\\<seu-usuario>\\anaconda3\\envs\\DrugHunter\\python.exe"}
                      </CodeBlock>
                    </div>
                  </div>
                </Step>

                <Step n={7} title="Verificar a instalação">
                  Use o botão abaixo para checar se tudo está configurado
                  corretamente. O resultado mostrará o que está OK e o que
                  precisa ser corrigido.
                </Step>
              </>
            )}
          </div>
        </Section>

        {/* ── Perguntas Frequentes ── */}
        <Section title="Perguntas Frequentes">
          <div className="flex flex-col gap-5">

            {/* FAQ — bson conflict */}
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-foreground">
                Erro: "module 'bson' has no attribute 'encode'"
              </p>
              <p className="text-[12px] text-foreground-subtle leading-relaxed">
                Esse erro ocorre quando o pacote <Code>bson</Code> standalone
                (do PyPI) está instalado no ambiente DrugHunter e entra em
                conflito com o <Code>pymongo</Code>. O DrugHunter usa o
                pymongo, que inclui seu próprio módulo <Code>bson</Code> —
                a versão standalone sobrescreve e quebra essa integração.
              </p>
              <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 flex flex-col gap-2">
                <p className="text-[12px] font-medium text-foreground-muted">
                  Como corrigir:
                </p>
                <CodeBlock>{"conda activate DrugHunter\npip uninstall bson -y"}</CodeBlock>
                <p className="text-[12px] text-foreground-subtle leading-relaxed">
                  Após remover o pacote, reinicie o PDB Explorer e clique em
                  "Testar Configuração" para confirmar que o conflito foi
                  resolvido.
                </p>
              </div>
            </div>

            <div className="border-t border-outline" />

            {/* FAQ — resultados sumindo */}
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-foreground">
                Por que meus resultados não estão aparecendo?
              </p>
              <p className="text-[12px] text-foreground-subtle leading-relaxed">
                O PDB Explorer{" "}
                <strong className="text-foreground-muted">
                  não armazena os resultados gerados
                </strong>{" "}
                — ele sempre lê diretamente os arquivos que o DrugHunter
                produziu no disco. O banco de dados guarda apenas referências
                (caminhos de pasta) e metadados do job (status, parâmetros
                usados). Se os arquivos no disco forem removidos, movidos ou
                renomeados, o PDB Explorer não consegue encontrá-los.
              </p>
              <div className="flex flex-col gap-2 mt-1">
                <p className="text-[12px] font-medium text-foreground-muted">
                  Causas comuns:
                </p>
                <div className="flex flex-col gap-2">
                  <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-foreground-muted">
                      A pasta de resultados foi apagada, renomeada ou movida
                    </span>
                    <p className="text-[12px] text-foreground-subtle leading-relaxed">
                      Os arquivos gerados pelo DrugHunter (CSVs, PNGs, .mol2,
                      .out) ficam dentro da pasta de saída configurada ao
                      iniciar cada módulo. Se essa pasta — ou qualquer
                      subpasta de resultado — foi deletada, renomeada ou
                      movida, o job ficará sem resultado mesmo que apareça
                      como "concluído" no histórico.
                    </p>
                  </div>
                  <div className="rounded-lg border border-outline bg-surface-secondary px-4 py-3 flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-foreground-muted">
                      A pasta inteira do DrugHunter foi movida
                    </span>
                    <p className="text-[12px] text-foreground-subtle leading-relaxed">
                      Se você moveu a pasta inteira do DrugHunter, basta
                      atualizar o campo{" "}
                      <button
                        type="button"
                        onClick={irParaConfiguracoes}
                        className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-accent underline underline-offset-2"
                      >
                        Configurações → Caminho do DrugHunter
                      </button>{" "}
                      para o novo local — todos os resultados existentes
                      serão encontrados automaticamente. O que não é
                      recuperável é mover ou renomear apenas uma subpasta de
                      resultado.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-yellow-400/30 bg-yellow-500/5 px-4 py-3 mt-1">
                <p className="text-[12px] text-foreground-subtle leading-relaxed">
                  <strong className="text-foreground-muted">
                    O que fazer:
                  </strong>{" "}
                  Se os arquivos originais não puderem ser recuperados, a
                  solução é{" "}
                  <strong className="text-foreground-muted">
                    rodar o módulo novamente
                  </strong>{" "}
                  seguindo o fluxo completo — ChEMBL → ADMET → Consenso (ou
                  Redocking) — para que o DrugHunter regenere todos os
                  arquivos no disco.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Testar Configuração (admin only) ── */}
        {isAdmin ? (
          <Section title="Testar Configuração">
            <p className="text-[12px] text-foreground-subtle leading-relaxed">
              Clique no botão abaixo para verificar se o DrugHunter e suas
              ferramentas estão acessíveis. O resultado mostrará o que está
              OK e o que precisa ser corrigido.
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
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[12px] font-medium text-foreground-muted">
                    {(() => {
                      const obrigatorios = checks.filter((c) => !c.opcional);
                      const opcionais = checks.filter((c) => c.opcional);
                      const okObrig = obrigatorios.filter((c) => c.ok).length;
                      const okOpc = opcionais.filter((c) => c.ok).length;
                      return `${okObrig}/${obrigatorios.length} obrigatórios OK · ${okOpc}/${opcionais.length} opcionais OK`;
                    })()}
                  </span>
                  {checks.filter((c) => !c.opcional).every((c) => c.ok) && (
                    <span className="text-[12px] text-accent font-medium">
                      Ambiente pronto ✓
                    </span>
                  )}
                </div>
                {checks.map((check, i) => (
                  <CheckRow
                    key={i}
                    check={check}
                    onAutoFix={
                      check.nome === "Conflito bson/pymongo" && !check.ok
                        ? handleCorrigirBson
                        : undefined
                    }
                    autoFixando={
                      check.nome === "Conflito bson/pymongo"
                        ? corrigindoBson
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </Section>
        ) : (
          <Section title="Testar Configuração">
            <p className="text-[12px] text-foreground-subtle">
              O botão de teste de configuração está disponível apenas para
              administradores. Solicite ao administrador do sistema que
              execute a verificação.
            </p>
          </Section>
        )}
      </main>
    </div>
  );
}
