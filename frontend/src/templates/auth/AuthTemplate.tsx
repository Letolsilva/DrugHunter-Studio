// templates/auth/AuthTemplate.tsx
import type { ChangeEvent, FormEvent } from "react";
import { Spinner } from "../../components/ui/Spinner";
import { FormField } from "../../components/ui/FormField";
import { AppLogoIcon } from "../../components/icons";

interface AuthTemplateProps {
  modo: "login" | "register";
  form: { email: string; username: string; password: string };
  erro: string;
  loading: boolean;
  setField: (
    k: "email" | "username" | "password",
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
  trocarModo: (novoModo: "login" | "register") => void;
  handleSubmit: (e: FormEvent) => void;
}

export default function AuthTemplate({
  modo,
  form,
  erro,
  loading,
  setField,
  trocarModo,
  handleSubmit,
}: AuthTemplateProps) {
  const isRegister = modo === "register";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-primary">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(#1e2d4a 1px, transparent 1px), linear-gradient(90deg, #1e2d4a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)",
          }}
        />
        <div
          className="absolute"
          style={{
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 600,
            height: 400,
            background:
              "radial-gradient(ellipse at center, rgba(0, 212, 170, 0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative px-8 z-10 bg-panel border border-outline-strong rounded-2xl w-full max-w-[420px] shadow-[0_24px_64px_rgba(0,0,0,0.55)] fade-in">
        {/* Header */}
        <div className="text-center pt-8 pb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <AppLogoIcon size={24} className="text-accent" />
            <span className="text-[22px] font-normal text-foreground tracking-tight">
              PDB<b className="font-bold text-accent">Explorer</b>
            </span>
          </div>
          <p className="text-[12px] text-foreground-subtle leading-snug mt-1">
            Análise de estruturas proteicas de hiperfungos
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex bg-surface-secondary border border-outline rounded-lg p-[3px]">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => trocarModo(m)}
                className={`flex-1 py-2 text-[13px] font-medium border-none cursor-pointer transition-all rounded-[calc(8px-2px)] ${
                  modo === m
                    ? "bg-panel-hover text-foreground shadow-sm"
                    : "bg-transparent text-foreground-subtle hover:text-foreground-muted"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/*
           * Campo e-mail colapsa com max-h + overflow-hidden no modo login.
           * Isso elimina o espaço em branco que "invisible" deixava.
           */}
          <div
            className={`transition-all duration-200 overflow-hidden ${
              isRegister ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
            }`}
            aria-hidden={!isRegister}
          >
            <FormField
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={setField("email")}
              autoComplete="email"
              tabIndex={isRegister ? undefined : -1}
              disabled={!isRegister}
            />
          </div>

          <FormField
            label={isRegister ? "Nome de usuário" : "E-mail ou usuário"}
            type="text"
            placeholder={isRegister ? "username" : "seu@email.com ou username"}
            value={form.username}
            onChange={setField("username")}
            autoComplete="username"
          />

          <FormField
            label="Senha"
            type="password"
            placeholder={isRegister ? "mínimo 6 caracteres" : "••••••••"}
            value={form.password}
            onChange={setField("password")}
            autoComplete={isRegister ? "new-password" : "current-password"}
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
          <div className="flex justify-center pt-1 pb-7">
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
          </div>
        </form>
      </div>
    </div>
  );
}
