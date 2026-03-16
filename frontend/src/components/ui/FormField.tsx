// components/ui/FormField.tsx
import type { ChangeEvent } from "react";

interface FormFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  tabIndex?: number;
  disabled?: boolean;
  className?: string;
}

export function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
  tabIndex,
  disabled,
  className,
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label className="text-[11px] font-medium text-[var(--text-2)] uppercase tracking-[0.06em]">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        tabIndex={tabIndex}
        disabled={disabled}
        className="w-full py-1.5 text-[13px]"
      />
    </div>
  );
}
