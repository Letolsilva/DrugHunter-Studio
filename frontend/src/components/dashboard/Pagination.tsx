// components/dashboard/Pagination.tsx
import { Button } from "../ui/Button";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons";

interface PaginationProps {
  pagina: number;
  paginas: number;
  onPrev: () => void;
  onNext: () => void;
}

export function Pagination({
  pagina,
  paginas,
  onPrev,
  onNext,
}: PaginationProps) {
  if (paginas <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <Button
        variant="ghost"
        onClick={onPrev}
        disabled={pagina === 1}
        style={{ padding: "6px 14px", fontSize: 13 }}
      >
        <span className="inline-flex items-center gap-1.5">
          <ArrowLeftIcon size={13} /> Anterior
        </span>
      </Button>
      <span className="text-[13px] text-foreground-muted">
        Página <b>{pagina}</b> de <b>{paginas}</b>
      </span>
      <Button
        variant="ghost"
        onClick={onNext}
        disabled={pagina === paginas}
        style={{ padding: "6px 14px", fontSize: 13 }}
      >
        <span className="inline-flex items-center gap-1.5">
          Próxima <ArrowRightIcon size={13} />
        </span>
      </Button>
    </div>
  );
}
