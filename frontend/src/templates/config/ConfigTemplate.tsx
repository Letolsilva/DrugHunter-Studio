// templates/config/ConfigTemplate.tsx
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar, DropdownMenu } from "../../components/layout";
import { MiddleBar } from "../../components/nav/MiddleBar";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Toast } from "../../components/ui/Toast";
import {
  AppLogoIcon,
  ClockIcon,
  DownloadIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  MoonIcon,
  RefreshIcon,
  SettingsIcon,
  SunIcon,
} from "../../components/icons";
import type { UseConfigPageReturn } from "../../pages/ConfigPage/useConfigPage";

const LABEL: Record<string, string> = {
  ttl_dias: "TTL do cache (dias)",
  max_por_proteina: "Máximo de estruturas por proteína",
  limpeza_automatica: "Limpeza automática",
  drug_hunter_path: "Caminho do DrugHunter",
  python_bin: "Executável Python (ambiente DH)",
  chimera_path: "Caminho do Chimera",
  dock6_path: "Caminho do Dock6",
  smtp_host: "Servidor SMTP",
  smtp_port: "Porta SMTP",
  smtp_user: "Usuário / Email de envio",
  smtp_password: "Senha SMTP",
  smtp_from: "Nome e endereço do remetente",
};

const DESCRICAO: Record<string, string> = {
  ttl_dias: "Dias sem consulta para expirar uma proteína do cache (1–365).",
  max_por_proteina:
    "Número máximo de estruturas retornadas por proteína (1–500).",
  limpeza_automatica:
    "Executar limpeza de TTL automaticamente na inicialização.",
  drug_hunter_path:
    "Para obter o caminho: abra o gerenciador de arquivos, navegue até a pasta do DrugHunter, clique com o botão direito → Copiar caminho; ou abra um terminal dentro da pasta e execute pwd.",
  python_bin:
    "Para obter o caminho: ative o ambiente com conda activate DH e execute which python no terminal. Cole o resultado aqui.",
  chimera_path:
    "Deixe vazio para detecção automática. Preencha apenas se o botão Testar Configuração (página Ajuda) indicar que o Chimera não foi encontrado.",
  dock6_path:
    "Deixe vazio para detecção automática. Preencha apenas se o botão Testar Configuração (página Ajuda) indicar que o Dock6 não foi encontrado.",
  smtp_host: "Host do servidor de email (ex: smtp.gmail.com).",
  smtp_port: "Porta de conexão SMTP (587 para TLS, 465 para SSL).",
  smtp_user: "Email usado para autenticar no servidor SMTP.",
  smtp_password:
    "Armazenada criptografada no banco. Deixe em branco para manter a senha atual.",
  smtp_from:
    "Remetente exibido nos emails (ex: PDB Explorer <email@gmail.com>).",
};

const PLACEHOLDER: Record<string, string> = {
  drug_hunter_path: "/home/<seu-usuario>/Área de Trabalho/DrugHunter",
  python_bin: "/home/<seu-usuario>/progs/anaconda3/envs/DH/bin/python",
  chimera_path: "/home/<seu-usuario>/progs/UCSF-Chimera64-1.x/bin",
  dock6_path: "/home/<seu-usuario>/progs/dock6/bin",
};

interface SectionProps {
  title: string;
  badge?: string;
  children: ReactNode;
}

function Section({ title, badge, children }: SectionProps) {
  return (
    <section className="rounded-xl border border-outline bg-panel p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <h2 className="text-[13px] font-semibold text-foreground-muted uppercase tracking-wide">
          {title}
        </h2>
        {badge && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent-12 text-accent border border-accent-25">
            {badge}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export default function ConfigTemplate({
  user,
  configs,
  loadingConfigs,
  saving,
  theme,
  toggleTheme,
  menuAberto,
  menuRef,
  toggleMenu,
  irParaHistorico,
  irParaRedocking,
  irParaMeusPdbs,
  irParaAjuda,
  handleLogout,
  handleSalvarConfig,
  handleLimparCache,
  toast,
  toastVariant,
  usuarios,
  loadingUsuarios,
  togglingAdmin,
  handleToggleAdmin,
}: UseConfigPageReturn) {
  const navigate = useNavigate();
  const getValor = (chave: string) =>
    configs.find((c) => c.chave === chave)?.valor ?? "";

  const [campos, setCampos] = useState<Record<string, string>>({});

  const valor = (chave: string) =>
    chave in campos ? campos[chave] : getValor(chave);

  const setCampo = (chave: string, v: string) =>
    setCampos((prev) => ({ ...prev, [chave]: v }));

  const salvar = async (chave: string) => {
    await handleSalvarConfig(chave, valor(chave));
  };

  const cacheChaves = ["ttl_dias", "limpeza_automatica"];
  const dhChaves = ["drug_hunter_path", "python_bin", "chimera_path", "dock6_path"];

  // Senha: mostra bolinhas quando configurada; entra no modo edição ao clicar "Alterar"
  const senhaConfigurada = getValor("smtp_password") === "__set__";
  const editandoSenha = "smtp_password" in campos;
  const removerCampo = (chave: string) =>
    setCampos((prev) => {
      const next = { ...prev };
      delete next[chave];
      return next;
    });

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary">
      <Navbar>
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
            Configurações
          </span>
        </Navbar.Left>

        <Navbar.Middle>
          <MiddleBar activeModule={null} />
        </Navbar.Middle>

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
              icon={<DownloadIcon size={14} />}
              label="Meus PDBs"
              onClick={irParaMeusPdbs}
              divider
            />
            <DropdownMenu.Item
              icon={<RefreshIcon size={14} />}
              label="Redocking"
              onClick={irParaRedocking}
              divider
            />
            <DropdownMenu.Item
              icon={<HelpIcon size={14} />}
              label="Ajuda"
              onClick={irParaAjuda}
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

      <main className="flex-1 max-w-215 w-full mx-auto px-8 py-10 flex flex-col gap-6 fade-in">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">
            Configurações
          </h1>
          <p className="text-[13px] text-foreground-muted">
            Ajuste as preferências do sistema e do DrugHunter.
          </p>
        </div>

        {/* ── Aparência ────────────────────────────────────────── */}
        <Section title="Aparência">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-medium text-foreground">
                Tema da interface
              </span>
              <span className="text-[12px] text-foreground-subtle">
                Alternar entre modo escuro e modo claro.
              </span>
            </div>
            <div
              className="inline-flex rounded-lg border border-outline overflow-hidden shrink-0"
              role="group"
              aria-label="Tema"
            >
              <button
                type="button"
                onClick={() => theme !== "dark" && toggleTheme()}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors cursor-pointer border-none ${
                  theme === "dark"
                    ? "bg-panel-hover text-accent"
                    : "bg-transparent text-foreground-subtle hover:text-foreground"
                }`}
              >
                <MoonIcon size={13} />
                Escuro
              </button>
              <span className="w-px bg-outline self-stretch" />
              <button
                type="button"
                onClick={() => theme !== "light" && toggleTheme()}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors cursor-pointer border-none ${
                  theme === "light"
                    ? "bg-panel-hover text-accent"
                    : "bg-transparent text-foreground-subtle hover:text-foreground"
                }`}
              >
                <SunIcon size={13} />
                Claro
              </button>
            </div>
          </div>
        </Section>

        {/* Usuários */}
        {user?.is_admin && (
          <Section title="Usuários" badge="Admin">
            {loadingUsuarios ? (
              <div className="flex items-center gap-2 text-[13px] text-foreground-subtle">
                <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
                Carregando usuários...
              </div>
            ) : usuarios.length === 0 ? (
              <p className="text-[13px] text-foreground-subtle">
                Nenhum usuário cadastrado.
              </p>
            ) : (
              <div className="flex flex-col">
                {usuarios.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-4 py-3 border-b border-outline last:border-b-0"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-medium text-foreground">
                          {u.username}
                        </span>
                        {u.is_admin && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent-12 text-accent border border-accent-25">
                            Admin
                          </span>
                        )}
                        {u.id === user?.id && (
                          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-outline text-foreground-subtle">
                            Você
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-foreground-subtle truncate">
                        {u.email}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={u.is_admin}
                      disabled={u.id === user?.id || togglingAdmin[u.id]}
                      onClick={() => handleToggleAdmin(u.id, !u.is_admin)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-none shrink-0 ${
                        u.id === user?.id || togglingAdmin[u.id]
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      } ${u.is_admin ? "bg-accent" : "bg-outline-strong"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          u.is_admin ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Seções de admin ──────────────────────────────────── */}
        {user?.is_admin && (
          <>
            {/* Cache */}
            <Section title="Cache de Proteínas" badge="Admin">
              {loadingConfigs ? (
                <div className="flex items-center gap-2 text-[13px] text-foreground-subtle">
                  <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Carregando configurações...
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {cacheChaves.map((chave) => (
                    <div
                      key={chave}
                      className="flex items-start justify-between gap-6 py-3 border-b border-outline last:border-b-0"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-[13px] font-medium text-foreground">
                          {LABEL[chave] ?? chave}
                        </span>
                        <span className="text-[12px] text-foreground-subtle">
                          {DESCRICAO[chave]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {chave === "limpeza_automatica" ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={valor(chave) === "true"}
                            onClick={() => {
                              const next =
                                valor(chave) === "true" ? "false" : "true";
                              setCampo(chave, next);
                              handleSalvarConfig(chave, next);
                            }}
                            disabled={saving[chave]}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer border-none shrink-0 ${
                              valor(chave) === "true"
                                ? "bg-accent"
                                : "bg-outline-strong"
                            } ${saving[chave] ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                valor(chave) === "true"
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        ) : (
                          <>
                            <input
                              type="number"
                              value={valor(chave)}
                              onChange={(e) => setCampo(chave, e.target.value)}
                              min={1}
                              max={chave === "ttl_dias" ? 365 : 500}
                              placeholder={chave === "ttl_dias" ? "30" : "50"}
                              className="w-24 rounded border border-outline bg-surface-secondary px-3 py-1.5 font-mono text-[13px] text-foreground text-right placeholder:text-foreground-subtle"
                            />
                            <Button
                              variant="ghost"
                              onClick={() => salvar(chave)}
                              disabled={
                                saving[chave] ||
                                valor(chave) === getValor(chave)
                              }
                              className="px-3 py-1.5 text-[12px]"
                            >
                              {saving[chave] ? (
                                <Spinner
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderWidth: 2,
                                  }}
                                />
                              ) : (
                                "Salvar"
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start justify-between gap-6 pt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-foreground">
                        Limpar cache agora
                      </span>
                      <span className="text-[12px] text-foreground-subtle">
                        Remove imediatamente proteínas expiradas pelo TTL.
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={handleLimparCache}
                      disabled={saving["limpar_cache"]}
                      className="shrink-0 px-3 py-1.5 text-[12px]"
                    >
                      {saving["limpar_cache"] ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Spinner
                            style={{ width: 12, height: 12, borderWidth: 2 }}
                          />
                          Limpando...
                        </span>
                      ) : (
                        "Limpar cache"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </Section>

            {/* DrugHunter */}
            <Section title="DrugHunter" badge="Admin">
              {loadingConfigs ? (
                <div className="flex items-center gap-2 text-[13px] text-foreground-subtle">
                  <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Carregando configurações...
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {dhChaves.map((chave) => (
                    <div key={chave} className="flex flex-col gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[13px] font-medium text-foreground">
                          {LABEL[chave] ?? chave}
                        </label>
                        <span className="text-[12px] text-foreground-subtle">
                          {DESCRICAO[chave]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={valor(chave)}
                          onChange={(e) => setCampo(chave, e.target.value)}
                          placeholder={PLACEHOLDER[chave] ?? ""}
                          className="flex-1 rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle"
                        />
                        <Button
                          variant="ghost"
                          onClick={() => salvar(chave)}
                          disabled={
                            saving[chave] || valor(chave) === getValor(chave)
                          }
                          className="shrink-0 px-3 py-2 text-[12px]"
                        >
                          {saving[chave] ? (
                            <Spinner
                              style={{ width: 12, height: 12, borderWidth: 2 }}
                            />
                          ) : (
                            "Salvar"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-foreground-subtle bg-surface-secondary rounded-lg px-3 py-2.5 border border-outline leading-relaxed">
                    Após preencher, use o botão{" "}
                    <span className="font-medium text-foreground-muted">Testar Configuração</span>{" "}
                    na página{" "}
                    <button
                      type="button"
                      onClick={irParaAjuda}
                      className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-accent underline underline-offset-2"
                    >
                      Ajuda
                    </button>{" "}
                    para verificar se tudo está correto antes de iniciar um redocking.
                  </p>
                </div>
              )}
            </Section>

            {/* Notificações por E-mail */}
            <Section title="Notificações por E-mail" badge="Admin">
              {loadingConfigs ? (
                <div className="flex items-center gap-2 text-[13px] text-foreground-subtle">
                  <Spinner style={{ width: 14, height: 14, borderWidth: 2 }} />
                  Carregando configurações...
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {/* Status */}
                  {senhaConfigurada && getValor("smtp_user") ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] border bg-accent-12 border-accent-25 text-accent">
                      ✓ Email de notificação configurado — o sistema enviará
                      avisos automaticamente
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] border bg-surface-secondary border-outline text-foreground-subtle">
                      Sem configuração de email — o sistema não enviará avisos
                      ao terminar
                    </div>
                  )}

                  <p className="text-[12px] text-foreground-subtle -mt-2">
                    Os avisos são enviados para o email de quem iniciou o
                    processo. Configure abaixo o email <em>remetente</em> (quem
                    envia).
                  </p>

                  {/* Email remetente */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[13px] font-medium text-foreground">
                        Email que envia as notificações
                      </label>
                      <span className="text-[12px] text-foreground-subtle">
                        Endereço de email que vai aparecer como remetente dos
                        avisos.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={valor("smtp_user")}
                        onChange={(e) => setCampo("smtp_user", e.target.value)}
                        placeholder="exemplo@gmail.com"
                        className="flex-1 rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => salvar("smtp_user")}
                        disabled={
                          saving["smtp_user"] ||
                          valor("smtp_user") === getValor("smtp_user")
                        }
                        className="shrink-0 px-3 py-2 text-[12px]"
                      >
                        {saving["smtp_user"] ? (
                          <Spinner
                            style={{ width: 12, height: 12, borderWidth: 2 }}
                          />
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Senha */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[13px] font-medium text-foreground">
                        Senha do email remetente
                      </label>
                      <span className="text-[12px] text-foreground-subtle">
                        Para Gmail, use uma{" "}
                        <strong className="text-foreground-muted">
                          Senha de App
                        </strong>{" "}
                        — não a senha normal da conta. Acesse{" "}
                        <span className="font-mono text-foreground-muted">
                          myaccount.google.com → Segurança → Senhas de app
                        </span>
                        .
                      </span>
                    </div>
                    {senhaConfigurada && !editandoSenha ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value="configurado"
                          disabled
                          className="flex-1 rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] opacity-50 cursor-not-allowed"
                        />
                        <Button
                          variant="ghost"
                          onClick={() => setCampo("smtp_password", "")}
                          className="shrink-0 px-3 py-2 text-[12px]"
                        >
                          Alterar senha
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          value={campos["smtp_password"] ?? ""}
                          onChange={(e) =>
                            setCampo("smtp_password", e.target.value)
                          }
                          placeholder="Cole aqui a senha de app"
                          autoComplete="new-password"
                          className="flex-1 rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle"
                        />
                        <Button
                          variant="ghost"
                          onClick={() =>
                            handleSalvarConfig(
                              "smtp_password",
                              campos["smtp_password"] ?? "",
                            )
                          }
                          disabled={
                            saving["smtp_password"] || !campos["smtp_password"]
                          }
                          className="shrink-0 px-3 py-2 text-[12px]"
                        >
                          {saving["smtp_password"] ? (
                            <Spinner
                              style={{ width: 12, height: 12, borderWidth: 2 }}
                            />
                          ) : (
                            "Salvar"
                          )}
                        </Button>
                        {senhaConfigurada && (
                          <Button
                            variant="ghost"
                            onClick={() => removerCampo("smtp_password")}
                            className="shrink-0 px-3 py-2 text-[12px] text-foreground-subtle"
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nome remetente (opcional) */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[13px] font-medium text-foreground">
                        Nome exibido nos emails{" "}
                        <span className="text-foreground-subtle font-normal">
                          (opcional)
                        </span>
                      </label>
                      <span className="text-[12px] text-foreground-subtle">
                        Nome que aparece como remetente. Deixe em branco para
                        usar o email.
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={valor("smtp_from")}
                        onChange={(e) => setCampo("smtp_from", e.target.value)}
                        placeholder="PDB Explorer"
                        className="flex-1 rounded border border-outline bg-surface-secondary px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => salvar("smtp_from")}
                        disabled={
                          saving["smtp_from"] ||
                          valor("smtp_from") === getValor("smtp_from")
                        }
                        className="shrink-0 px-3 py-2 text-[12px]"
                      >
                        {saving["smtp_from"] ? (
                          <Spinner
                            style={{ width: 12, height: 12, borderWidth: 2 }}
                          />
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Servidor avançado */}
                  <div className="rounded-lg border border-outline bg-surface-secondary p-4 flex flex-col gap-4">
                    <span className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wide">
                      Configurações avançadas do servidor
                    </span>
                    <div className="flex gap-3 items-end">
                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[12px] font-medium text-foreground">
                          Servidor de envio
                        </label>
                        <input
                          type="text"
                          value={valor("smtp_host")}
                          onChange={(e) =>
                            setCampo("smtp_host", e.target.value)
                          }
                          placeholder="smtp.gmail.com"
                          className="rounded border border-outline bg-panel px-3 py-2 font-mono text-[12px] text-foreground placeholder:text-foreground-subtle w-full"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[12px] font-medium text-foreground">
                          Porta
                        </label>
                        <input
                          type="number"
                          value={valor("smtp_port")}
                          onChange={(e) =>
                            setCampo("smtp_port", e.target.value)
                          }
                          placeholder="587"
                          min={1}
                          max={65535}
                          className="w-24 rounded border border-outline bg-panel px-3 py-2 font-mono text-[12px] text-foreground text-right placeholder:text-foreground-subtle"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          await salvar("smtp_host");
                          await salvar("smtp_port");
                        }}
                        disabled={
                          saving["smtp_host"] ||
                          saving["smtp_port"] ||
                          (valor("smtp_host") === getValor("smtp_host") &&
                            valor("smtp_port") === getValor("smtp_port"))
                        }
                        className="shrink-0 px-3 py-2 text-[12px]"
                      >
                        {saving["smtp_host"] || saving["smtp_port"] ? (
                          <Spinner
                            style={{ width: 12, height: 12, borderWidth: 2 }}
                          />
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-foreground-subtle leading-relaxed">
                      Gmail:{" "}
                      <span className="font-mono text-foreground-muted">
                        smtp.gmail.com
                      </span>
                      , porta{" "}
                      <span className="font-mono text-foreground-muted">
                        587
                      </span>{" "}
                      · Outlook:{" "}
                      <span className="font-mono text-foreground-muted">
                        smtp.office365.com
                      </span>
                      , porta{" "}
                      <span className="font-mono text-foreground-muted">
                        587
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </Section>
          </>
        )}

        {/* Aviso para não-admins */}
        {!user?.is_admin && (
          <div className="rounded-xl border border-outline bg-panel px-6 py-5 text-center">
            <p className="text-[13px] text-foreground-subtle">
              Configurações de sistema disponíveis apenas para administradores.
            </p>
          </div>
        )}
      </main>

      <Toast message={toast} variant={toastVariant} />
    </div>
  );
}
