// pages/ForgotPasswordPage/ForgotPasswordPage.tsx
import { type ChangeEvent, type FormEvent } from "react";
import { DecorativeBackground } from "../../components/ui/DecorativeBackground";
import { AppLogoIcon } from "../../components/icons";
import { FormField } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";
import { useForgotPasswordPage } from "./useForgotPasswordPage";

export default function ForgotPasswordPage() {
  const { email, setEmail, loading, erro, sucesso, handleSubmit, navigate } =
    useForgotPasswordPage();

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-surface-primary">
      <DecorativeBackground />
      <div className="relative px-8 z-10 bg-panel border border-outline-strong rounded-2xl w-full max-w-[420px] shadow-[0_24px_64px_rgba(0,0,0,0.55)] fade-in">
        <div className="text-center pt-8 pb-5">
          <div className="inline-flex items-center gap-2 mb-2">
            <AppLogoIcon size={24} className="text-accent" />
            <span className="text-[22px] font-normal text-foreground tracking-tight">
              DrugHunter<b className="font-bold text-accent">Studio</b>
            </span>
          </div>
          <p className="text-[13px] text-foreground-muted mt-2 font-medium">
            Recuperar senha
          </p>
        </div>

        {sucesso ? (
          <div className="pb-8 flex flex-col items-center gap-4 text-center">
            <div
              className="rounded-lg px-4 py-3 text-[13px] leading-snug"
              style={{
                background: "var(--color-accent-15)",
                border: "1px solid var(--color-accent-30)",
                color: "var(--color-foreground)",
              }}
            >
              Se o e-mail estiver cadastrado, você receberá as instruções para
              redefinir a senha em breve.
            </div>
            <button
              className="btn-primary px-10 py-2.5 text-[13px] h-auto rounded-lg mt-2"
              onClick={() => navigate("/")}
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit as (e: FormEvent) => void} className="flex flex-col gap-4 pb-7">
            <p className="text-[12px] text-foreground-subtle leading-snug -mt-1">
              Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos
              um código para redefinir a senha.
            </p>

            <FormField
              label="E-mail*"
              type="text"
              placeholder="seu@email.com"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <div
              className={`transition-all duration-150 overflow-hidden ${
                erro ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-[12px] leading-snug">
                {erro}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                className="btn-primary px-12 py-2.5 text-[13px] h-auto rounded-lg w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner /> Enviando...
                  </>
                ) : (
                  "Enviar instruções"
                )}
              </button>
              <button
                type="button"
                className="text-[12px] text-foreground-subtle hover:text-foreground transition-colors py-1"
                onClick={() => navigate("/")}
              >
                Voltar ao login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
