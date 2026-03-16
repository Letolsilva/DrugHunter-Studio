// pages/AuthPage/useAuthPage.ts
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

type Modo = "login" | "register";

interface AuthForm {
  email: string;
  username: string;
  password: string;
}

export interface UseAuthPageReturn {
  modo: Modo;
  form: AuthForm;
  erro: string;
  loading: boolean;
  setField: (k: keyof AuthForm) => (e: ChangeEvent<HTMLInputElement>) => void;
  trocarModo: (novoModo: Modo) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
}

export function useAuthPage(): UseAuthPageReturn {
  const [modo, setModo] = useState<Modo>("login");
  const [form, setForm] = useState<AuthForm>({
    email: "",
    username: "",
    password: "",
  });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const setField = (k: keyof AuthForm) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const trocarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setErro("");
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      if (modo === "login") {
        await login(form.username, form.password);
      } else {
        if (!form.email || !form.username || !form.password)
          throw new Error("Preencha todos os campos.");
        if (form.password.length < 6)
          throw new Error("Senha deve ter no mínimo 6 caracteres.");
        await register(form.email, form.username, form.password);
      }
      navigate("/search");
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return { modo, form, erro, loading, setField, trocarModo, handleSubmit };
}
