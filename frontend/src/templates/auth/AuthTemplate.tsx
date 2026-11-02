// templates/auth/AuthTemplate.tsx
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Spinner } from "../../components/ui/Spinner";
import { FormField } from "../../components/ui/FormField";
import { TabSwitcher } from "../../components/ui/TabSwitcher";
import { DecorativeBackground } from "../../components/ui/DecorativeBackground";
import { AppLogoIcon } from "../../components/icons";

type AuthField = "email" | "username" | "password";
type FieldErrors = Partial<Record<AuthField, string>>;

interface AuthTemplateProps {
  modo: "login" | "register";
  form: { email: string; username: string; password: string };
  erro: string;
  fieldErrors: FieldErrors;
  loading: boolean;
  setField: (k: AuthField) => (e: ChangeEvent<HTMLInputElement>) => void;
  trocarModo: (novoModo: "login" | "register") => void;
  handleSubmit: (e: FormEvent) => void;
}

export default function AuthTemplate({
  modo,
  form,
  erro,
  fieldErrors,
  loading,
  setField,
  trocarModo,
  handleSubmit,
}: AuthTemplateProps) {
  const isRegister = modo === "register";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-primary">
      <DecorativeBackground />

      <div className="relative px-8 z-10 bg-panel border border-outline-strong rounded-2xl w-full max-w-[420px] shadow-[0_24px_64px_rgba(0,0,0,0.55)] fade-in">
        {/* Header */}
        <div className="text-center pt-8 pb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <AppLogoIcon size={24} className="text-accent" />
            <span className="text-[22px] font-normal text-foreground tracking-tight">
              DrugHunter<b className="font-bold text-accent">Studio</b>
            </span>
          </div>
          <p className="text-[12px] text-foreground-subtle leading-snug mt-1">
            Análise de estruturas proteicas de hiperfungos
          </p>
        </div>

        <div className="mb-6">
          <TabSwitcher
            tabs={[
              { value: "login", label: "Entrar" },
              { value: "register", label: "Criar conta" },
            ]}
            active={modo}
            onChange={trocarModo}
          />
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div
            className={`transition-all duration-200 overflow-hidden ${
              isRegister ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!isRegister}
          >
            <FormField
              label="E-mail*"
              type="text"
              placeholder="seu@email.com"
              value={form.email}
              onChange={setField("email")}
              autoComplete="email"
              tabIndex={isRegister ? undefined : -1}
              disabled={!isRegister}
              error={fieldErrors.email}
            />
          </div>

          <FormField
            label={isRegister ? "Nome de usuário*" : "E-mail ou usuário*"}
            type="text"
            placeholder={isRegister ? "username" : "seu@email.com ou username"}
            value={form.username}
            onChange={setField("username")}
            autoComplete="username"
            error={fieldErrors.username}
          />

          <FormField
            label="Senha*"
            type="password"
            placeholder={isRegister ? "mínimo 6 caracteres" : "••••••••"}
            value={form.password}
            onChange={setField("password")}
            autoComplete={isRegister ? "new-password" : "current-password"}
            error={fieldErrors.password}
          />

          {/* Área de erro — colapsa quando vazia para não gerar espaço extra */}
          <div
            className={`transition-all duration-150 overflow-hidden ${
              erro ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-[12px] leading-snug">
              {erro}
            </div>
          </div>

          {/* Botão com espaçamento superior fixo */}
          <div className="flex flex-col items-center gap-2 pt-1 pb-7">
            <button
              type="submit"
              className="btn-primary px-12 py-2.5 text-[13px] h-auto rounded-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner /> Aguarde...
                </>
              ) : isRegister ? (
                "Criar conta"
              ) : (
                "Entrar"
              )}
            </button>
            {!isRegister && (
              <Link
                to="/esqueceu-senha"
                className="text-[12px] text-foreground-subtle hover:text-accent transition-colors"
              >
                Esqueceu a senha?
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
