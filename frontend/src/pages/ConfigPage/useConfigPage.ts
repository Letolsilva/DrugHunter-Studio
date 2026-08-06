// pages/ConfigPage/useConfigPage.ts
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import type { ConfigUseCase } from "../../data/usecases/config.usecase";
import type { ConfigItemModel, UsuarioItemModel } from "../../domain/models/config.model";
import type { Theme } from "../../contexts/ThemeContext";
import type { UserModel } from "../../domain/models/auth.model";

export interface UseConfigPageReturn {
  user: UserModel | null;
  configs: ConfigItemModel[];
  loadingConfigs: boolean;
  saving: Record<string, boolean>;
  theme: Theme;
  toggleTheme: () => void;
  menuAberto: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  toggleMenu: () => void;
  irParaBusca: () => void;
  irParaHistorico: () => void;
  irParaRedocking: () => void;
  irParaMeusPdbs: () => void;
  irParaAjuda: () => void;
  handleLogout: () => void;
  handleSalvarConfig: (chave: string, valor: string) => Promise<void>;
  handleLimparCache: () => Promise<void>;
  toast: string | null;
  toastVariant: "success" | "error";
  usuarios: UsuarioItemModel[];
  loadingUsuarios: boolean;
  togglingAdmin: Record<number, boolean>;
  handleToggleAdmin: (id: number, isAdmin: boolean) => Promise<void>;
}

export function useConfigPage(
  configUseCase: ConfigUseCase,
): UseConfigPageReturn {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [configs, setConfigs] = useState<ConfigItemModel[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [usuarios, setUsuarios] = useState<UsuarioItemModel[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [togglingAdmin, setTogglingAdmin] = useState<Record<number, boolean>>({});

  const showToast = useCallback(
    (msg: string, variant: "success" | "error" = "success") => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastVariant(variant);
      setToast(msg);
      toastTimer.current = setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  useEffect(() => {
    if (!menuAberto) return;
    function handleClickFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, [menuAberto]);

  useEffect(() => {
    if (!user?.is_admin) return;
    const token = localStorage.getItem("access_token") ?? "";
    setLoadingConfigs(true);
    configUseCase
      .getConfigs(token)
      .then((data) => setConfigs(data.configs ?? []))
      .catch(() => showToast("Erro ao carregar configurações.", "error"))
      .finally(() => setLoadingConfigs(false));
  }, [user, configUseCase, showToast]);

  useEffect(() => {
    if (!user?.is_admin) return;
    const token = localStorage.getItem("access_token") ?? "";
    setLoadingUsuarios(true);
    configUseCase
      .listarUsuarios(token)
      .then((data) => setUsuarios(data.usuarios ?? []))
      .catch(() => showToast("Erro ao carregar usuários.", "error"))
      .finally(() => setLoadingUsuarios(false));
  }, [user, configUseCase, showToast]);

  const handleLogout = useCallback(() => {
    setMenuAberto(false);
    logout();
    navigate("/");
  }, [logout, navigate]);

  const toggleMenu = useCallback(() => setMenuAberto((v) => !v), []);

  const irParaBusca = useCallback(() => {
    setMenuAberto(false);
    navigate("/search");
  }, [navigate]);

  const irParaHistorico = useCallback(() => {
    setMenuAberto(false);
    navigate("/historico");
  }, [navigate]);

  const irParaRedocking = useCallback(() => {
    setMenuAberto(false);
    navigate("/redocking");
  }, [navigate]);

  const irParaMeusPdbs = useCallback(() => {
    setMenuAberto(false);
    navigate("/meus-pdbs");
  }, [navigate]);

  const irParaAjuda = useCallback(() => {
    setMenuAberto(false);
    navigate("/ajuda");
  }, [navigate]);

  const handleSalvarConfig = useCallback(
    async (chave: string, valor: string) => {
      const token = localStorage.getItem("access_token") ?? "";
      setSaving((prev) => ({ ...prev, [chave]: true }));
      try {
        await configUseCase.setConfig(chave, valor, token);
        setConfigs((prev) =>
          prev.map((c) => (c.chave === chave ? { ...c, valor } : c)),
        );
        showToast("Configuração salva com sucesso.", "success");
      } catch {
        showToast("Erro ao salvar configuração.", "error");
      } finally {
        setSaving((prev) => ({ ...prev, [chave]: false }));
      }
    },
    [configUseCase, showToast],
  );

  const handleLimparCache = useCallback(async () => {
    const token = localStorage.getItem("access_token") ?? "";
    setSaving((prev) => ({ ...prev, limpar_cache: true }));
    try {
      const result = await configUseCase.limparCache(token);
      showToast(
        `Cache limpo: ${result.removidas} proteína(s) removida(s).`,
        "success",
      );
    } catch {
      showToast("Erro ao limpar o cache.", "error");
    } finally {
      setSaving((prev) => ({ ...prev, limpar_cache: false }));
    }
  }, [configUseCase, showToast]);

  const handleToggleAdmin = useCallback(
    async (usuarioId: number, isAdmin: boolean) => {
      const token = localStorage.getItem("access_token") ?? "";
      setTogglingAdmin((prev) => ({ ...prev, [usuarioId]: true }));
      try {
        await configUseCase.setAdmin(usuarioId, isAdmin, token);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === usuarioId ? { ...u, is_admin: isAdmin } : u)),
        );
        showToast(
          `Permissão de administrador ${isAdmin ? "concedida" : "removida"}.`,
          "success",
        );
      } catch {
        showToast("Erro ao alterar permissão.", "error");
      } finally {
        setTogglingAdmin((prev) => ({ ...prev, [usuarioId]: false }));
      }
    },
    [configUseCase, showToast],
  );

  return {
    user,
    configs,
    loadingConfigs,
    saving,
    theme,
    toggleTheme,
    menuAberto,
    menuRef,
    toggleMenu,
    irParaBusca,
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
  };
}
