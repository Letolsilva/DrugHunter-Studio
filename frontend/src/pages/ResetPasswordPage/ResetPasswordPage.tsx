// pages/ResetPasswordPage/ResetPasswordPage.tsx
import { type ChangeEvent, type FormEvent } from "react";
import { DecorativeBackground } from "../../components/ui/DecorativeBackground";
import { AppLogoIcon } from "../../components/icons";
import { FormField } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";
import { useResetPasswordPage } from "./useResetPasswordPage";

export default function ResetPasswordPage() {
  const {
    token,
    novaSenha,
    setNovaSenha,
    confirmar,
    setConfirmar,
    loading,
    erro,
    sucesso,
    handleSubmit,
    navigate,
  } = useResetPasswordPage();

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
            Nova senha
          </p>
        </div>

        {!token ? (
          <div className="pb-8 flex flex-col items-center gap-4 text-center">
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-[13px] leading-snug">
              Link inválido. Use o link de recuperação recebido por e-mail.
            </div>
            <button
              className="btn-primary px-10 py-2.5 text-[13px] h-auto rounded-lg mt-2"
              onClick={() => navigate("/")}
            >
              Voltar ao login
            </button>
          </div>
        ) : sucesso ? (
          <div className="pb-8 flex flex-col items-center gap-4 text-center">
            <div
              className="rounded-lg px-4 py-3 text-[13px] leading-snug"
              style={{
                background: "var(--color-accent-15)",
                border: "1px solid var(--color-accent-30)",
                color: "var(--color-foreground)",
              }}
            >
              Senha redefinida com sucesso! Faça login com a nova senha.
            </div>
            <button
              className="btn-primary px-10 py-2.5 text-[13px] h-auto rounded-lg mt-2"
              onClick={() => navigate("/")}
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit as (e: FormEvent) => void} className="flex flex-col gap-4 pb-7">
            <FormField
              label="Nova senha*"
              type="password"
              placeholder="mínimo 6 caracteres"
              value={novaSenha}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
            />
            <FormField
              label="Confirmar senha*"
              type="password"
              placeholder="repita a nova senha"
              value={confirmar}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmar(e.target.value)}
              autoComplete="new-password"
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
                    <Spinner /> Salvando...
                  </>
                ) : (
                  "Redefinir senha"
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
