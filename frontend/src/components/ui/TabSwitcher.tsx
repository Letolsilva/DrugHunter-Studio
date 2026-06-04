interface Tab<T extends string> {
  value: T;
  label: string;
}

interface TabSwitcherProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (value: T) => void;
}

export function TabSwitcher<T extends string>({
  tabs,
  active,
  onChange,
}: TabSwitcherProps<T>) {
  return (
    <div className="flex bg-surface-secondary border border-outline rounded-lg p-[3px]">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-2 text-[13px] font-medium border-none cursor-pointer transition-all rounded-[calc(8px-2px)] ${
            active === tab.value
              ? "bg-panel-hover text-foreground shadow-sm"
              : "bg-transparent text-foreground-subtle hover:text-foreground-muted"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
