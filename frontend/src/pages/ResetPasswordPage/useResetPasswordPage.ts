// pages/ResetPasswordPage/useResetPasswordPage.ts
import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authUseCase } from "../../container";

export function useResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setErro("Token inválido. Use o link recebido por e-mail.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      await authUseCase.resetPassword(token, novaSenha);
      setSucesso(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return { token, novaSenha, setNovaSenha, confirmar, setConfirmar, loading, erro, sucesso, handleSubmit, navigate };
}
