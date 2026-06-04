interface SearchBoxTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function SearchBoxTextArea({
  value,
  onChange,
  onSubmit,
  placeholder,
  rows = 3,
  disabled = false,
}: SearchBoxTextAreaProps) {
  return (
    <textarea
      className="w-full resize-none rounded-none border-none border-b border-outline bg-transparent p-5 font-mono text-[15px] leading-relaxed text-foreground placeholder-foreground-subtle focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      disabled={disabled}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.ctrlKey) onSubmit();
      }}
    />
  );
}
