import { HistoryItemCard } from "./historycard";
import type { SearchHistoryItem } from "../../domain/models/history.model";

interface HistoryItemCardErrorProps {
  item: SearchHistoryItem;
  onDelete: () => void;
}

export function HistoryItemCardError({
  item,
  onDelete,
}: HistoryItemCardErrorProps) {
  const mensagem = item.mensagem_erro
    ? `Falha ao consultar o RCSB PDB: ${
        item.mensagem_erro.length > 120
          ? item.mensagem_erro.slice(0, 120) + "…"
          : item.mensagem_erro
      }`
    : "Não foi possível obter dados do RCSB PDB. Isso pode ocorrer por instabilidade temporária da API externa. Tente refazer a busca.";

  return (
    <HistoryItemCard
      onClick={() => {}}
      onDelete={onDelete}
      disabled
      title={
        item.mensagem_erro ??
        "Esta busca falhou e não possui resultados para exibir."
      }
    >
      <div className="min-w-0 flex-1">
        <HistoryItemCard.Title muted>
          {item.proteina_query}
        </HistoryItemCard.Title>
        <HistoryItemCard.Details>
          <span className="font-mono text-[11px] text-foreground-subtle">
            {item.hora_local}
          </span>
          <span className="rounded bg-red-12 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-red">
            ERRO
          </span>
        </HistoryItemCard.Details>
        <p className="mt-1 break-words font-mono text-[12px] leading-relaxed text-red opacity-80">
          {mensagem}
        </p>
      </div>
    </HistoryItemCard>
  );
}
