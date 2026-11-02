// pages/ForgotPasswordPage/useForgotPasswordPage.ts
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { authUseCase } from "../../container";

export function useForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErro("Informe o e-mail cadastrado.");
      return;
    }
    setErro("");
    setLoading(true);
    try {
      await authUseCase.forgotPassword(email.trim());
      setSucesso(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return { email, setEmail, loading, erro, sucesso, handleSubmit, navigate };
}
