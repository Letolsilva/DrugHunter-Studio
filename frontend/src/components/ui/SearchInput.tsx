// components/ui/SearchInput.tsx
import { SearchIcon } from "../icons";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-outline bg-surface-primary pl-9 pr-2.5 text-[13px] text-foreground placeholder:text-foreground-subtle focus:border-outline-strong focus:outline-none"
      />
    </div>
  );
}
