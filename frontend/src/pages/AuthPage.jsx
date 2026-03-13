// pages/AuthPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import styles from "./AuthPage.module.css";

export default function AuthPage() {
  const [modo, setModo] = useState("login"); // 'login' | 'register'
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
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
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* Fundo decorativo */}
      <div className={styles.bg}>
        <div className={styles.grid} />
        <div className={styles.glow} />
      </div>

      <div className={styles.box + " fade-in"}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>⬡</span>
            <span className={styles.logoText}>
              PDB<b>Explorer</b>
            </span>
          </div>
          <p className={styles.tagline}>
            Análise de estruturas proteicas de hiperfungos
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={
              styles.tab + (modo === "login" ? " " + styles.tabActive : "")
            }
            onClick={() => {
              setModo("login");
              setErro("");
            }}
          >
            Entrar
          </button>
          <button
            className={
              styles.tab + (modo === "register" ? " " + styles.tabActive : "")
            }
            onClick={() => {
              setModo("register");
              setErro("");
            }}
          >
            Criar conta
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {modo === "register" && (
            <div className={styles.field}>
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
              />
            </div>
          )}

          <div className={styles.field}>
            <label>
              {modo === "login" ? "E-mail ou usuário" : "Nome de usuário"}
            </label>
            <input
              type="text"
              placeholder={
                modo === "login" ? "seu@email.com ou username" : "username"
              }
              value={form.username}
              onChange={set("username")}
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label>Senha</label>
            <input
              type="password"
              placeholder={
                modo === "login" ? "••••••••" : "mínimo 6 caracteres"
              }
              value={form.password}
              onChange={set("password")}
              autoComplete={
                modo === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          {erro && <div className={styles.erro}>{erro}</div>}

          <button
            type="submit"
            className={"btn-primary w-full " + styles.submit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Aguarde...
              </>
            ) : modo === "login" ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        {modo === "register" && (
          <p className={styles.hint}>
            O primeiro usuário cadastrado recebe permissão de administrador.
          </p>
        )}
      </div>
    </div>
  );
}
