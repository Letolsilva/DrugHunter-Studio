// components/visualizador/GlobalAccumulatedPanel.tsx
// Painel que consome o VisualizadorContext diretamente — renderizado em App.tsx
// assim persiste em qualquer rota quando há itens selecionados.
import { useState, useRef, useCallback } from "react";
import { useVisualizador } from "../../contexts/VisualizadorContext";
import { useRedocking } from "../../contexts/RedockingContext";
import { AccumulatedPanel } from "./AccumulatedPanel";
import { Toast } from "../ui/Toast";

export function GlobalAccumulatedPanel() {
  const { selecionados, limparTudo, limparPdb, organismoAtual } = useVisualizador();
  const { salvarCsvNoServidor } = useRedocking();
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">(
    "success",
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, variant: "success" | "error") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToastVariant(variant);
      setToast(message);
      timerRef.current = setTimeout(() => setToast(null), 4000);
    },
    [],
  );

  const gerarCsv = useCallback(() => {
    if (selecionados.length === 0) return;
    const header = "PDB_CODE,LIGAND,RESNUM,CHAIN,RESOLUTION";
    const linhas = selecionados.map(
      (s) =>
        `${s.pdb_id},${s.ligand},${s.resnum},${s.chain},${s.resolucao ?? ""}`,
    );
    const csv = [header, ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    // Salva no servidor em background (sem bloquear o download)
    // Passa o organismo como target para pré-preencher o campo de redocking
    salvarCsvNoServidor(csv, "pdb_codes.csv", organismoAtual ?? undefined);

    if ("showSaveFilePicker" in window) {
      setSalvando(true);
      (window as any)
        .showSaveFilePicker({
          suggestedName: "pdb_codes.csv",
          types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
        })
        .then(async (fh: any) => {
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
          setSalvando(false);
          showToast("pdb_codes.csv salvo com sucesso", "success");
          limparTudo();
        })
        .catch(() => {
          setSalvando(false);
        });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pdb_codes.csv";
      a.click();
      URL.revokeObjectURL(url);
      showToast("pdb_codes.csv baixado com sucesso", "success");
      limparTudo();
    }
  }, [selecionados, limparTudo, showToast]);

  return (
    <>
      <AccumulatedPanel
        selecionados={selecionados}
        onLimparTudo={limparTudo}
        onLimparPdb={limparPdb}
        onGerarCsv={gerarCsv}
        salvando={salvando}
      />
      <Toast message={toast} variant={toastVariant} />
    </>
  );
}
