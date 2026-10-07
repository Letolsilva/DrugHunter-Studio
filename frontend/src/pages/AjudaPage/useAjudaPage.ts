// pages/AjudaPage/useAjudaPage.ts
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { ConfigUseCase, CheckItemDH } from "../../data/usecases/config.usecase";

export interface UseAjudaPageReturn {
  isAdmin: boolean;
  irParaBusca: () => void;
  irParaRedocking: () => void;
  irParaConfiguracoes: () => void;
  handleLogout: () => void;
  validando: boolean;
  checks: CheckItemDH[] | null;
  erroValidacao: string | null;
  handleValidar: () => Promise<void>;
  corrigindoBson: boolean;
  handleCorrigirBson: () => Promise<void>;
}

export function useAjudaPage(configUseCase: ConfigUseCase): UseAjudaPageReturn {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [validando, setValidando] = useState(false);
  const [checks, setChecks] = useState<CheckItemDH[] | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  const [corrigindoBson, setCorrigindoBson] = useState(false);
  const irParaBusca = useCallback(() => navigate("/busca-pdb"), [navigate]);
  const irParaRedocking = useCallback(() => navigate("/redocking"), [navigate]);
  const irParaConfiguracoes = useCallback(() => navigate("/configuracoes"), [navigate]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
  }, [logout, navigate]);

  const handleValidar = useCallback(async () => {
    const token = localStorage.getItem("access_token") ?? "";
    setValidando(true);
    setErroValidacao(null);
    try {
      const data = await configUseCase.validarDrugHunter(token);
      setChecks(data.checks);
    } catch {
      setErroValidacao("Erro ao conectar com o servidor. Verifique se o backend está rodando.");
    } finally {
      setValidando(false);
    }
  }, [configUseCase]);

  const handleCorrigirBson = useCallback(async () => {
    const token = localStorage.getItem("access_token") ?? "";
    setCorrigindoBson(true);
    try {
      const resultado = await configUseCase.corrigirBson(token);
      if (resultado.ok) {
        // Atualiza o check de bson na lista atual sem re-rodar toda a validação
        setChecks((prev) =>
          prev
            ? prev.map((c) =>
                c.nome === "Conflito bson/pymongo"
                  ? { ...c, ok: true, mensagem: resultado.mensagem, como_corrigir: null }
                  : c,
              )
            : prev,
        );
      } else {
        setErroValidacao(resultado.mensagem);
      }
    } catch {
      setErroValidacao("Erro ao tentar corrigir o conflito bson. Verifique se o backend está rodando.");
    } finally {
      setCorrigindoBson(false);
    }
  }, [configUseCase]);

  return {
    isAdmin: user?.is_admin ?? false,
    irParaBusca,
    irParaRedocking,
    irParaConfiguracoes,
    handleLogout,
    validando,
    checks,
    erroValidacao,
    handleValidar,
    corrigindoBson,
    handleCorrigirBson,
  };
}
