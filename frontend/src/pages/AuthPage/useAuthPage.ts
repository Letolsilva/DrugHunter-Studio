// pages/AuthPage/useAuthPage.ts
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as yup from "yup";
import { useAuth } from "../../contexts/AuthContext";

type Modo = "login" | "register";

interface AuthForm {
  email: string;
  username: string;
  password: string;
}

type FieldErrors = Partial<Record<keyof AuthForm, string>>;

const loginSchema = yup.object({
  username: yup.string().required("E-mail ou usuário é obrigatório."),
  password: yup.string().required("Senha é obrigatória."),
});

const registerSchema = yup.object({
  email: yup
    .string()
    .email("Informe um e-mail válido.")
    .required("E-mail é obrigatório."),
  username: yup.string().required("Nome de usuário é obrigatório."),
  password: yup
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres.")
    .required("Senha é obrigatória."),
});

export interface UseAuthPageReturn {
  modo: Modo;
  form: AuthForm;
  erro: string;
  fieldErrors: FieldErrors;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const setField =
    (k: keyof AuthForm) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [k]: undefined }));
    };

  const trocarModo = (novoModo: Modo) => {
    setModo(novoModo);
    setErro("");
    setFieldErrors({});
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setFieldErrors({});

    const schema = modo === "login" ? loginSchema : registerSchema;
    try {
      await schema.validate(form, { abortEarly: false });
    } catch (validationErr) {
      if (validationErr instanceof yup.ValidationError) {
        const errors: FieldErrors = {};
        for (const inner of validationErr.inner) {
          const path = inner.path as keyof AuthForm;
          if (path && !errors[path]) errors[path] = inner.message;
        }
        setFieldErrors(errors);
        return;
      }
    }

    setLoading(true);
    try {
      if (modo === "login") {
        await login(form.username, form.password);
      } else {
        await register(form.email, form.username, form.password);
      }
      navigate("/busca-pdb");
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return {
    modo,
    form,
    erro,
    fieldErrors,
    loading,
    setField,
    trocarModo,
    handleSubmit,
  };
}
