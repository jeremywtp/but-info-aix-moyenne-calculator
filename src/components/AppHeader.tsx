import type { Config, Year, Formation, Parcours } from "@/types";

interface AppHeaderProps {
  config: Config;
  onConfigChange: (partial: Partial<Config>) => void;
}

function SelectorGroup({
  label,
  options,
  active,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`selector-group ${disabled ? "disabled" : ""}`}>
      <span className="selector-label">{label}</span>
      <div className="selector-buttons">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`selector-btn ${active === opt.value ? "active" : ""} ${disabled ? "disabled" : ""}`}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AppHeader({ config, onConfigChange }: AppHeaderProps) {
  const isYear1 = config.year === "1";

  return (
    <header className="app-header">
      <div className="header-main">
        <div className="header-left">
          <span className="header-bracket">[</span>
          <span className="header-title">Coefficient</span>
          <span className="header-sep">::</span>
          <span className="header-subtitle">BUT Informatique Aix-en-Provence</span>
          <span className="header-bracket">]</span>
        </div>
        <div className="header-center">
          <div className="config-selector">
            <SelectorGroup
              label="ANNÉE"
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
              active={config.year}
              onChange={v => onConfigChange({ year: v as Year })}
            />
            <div className="selector-divider" />
            <SelectorGroup
              label="FORMATION"
              options={[
                { value: "FA", label: "FA" },
                { value: "FI", label: "FI" },
              ]}
              active={config.formation}
              onChange={v => onConfigChange({ formation: v as Formation })}
              disabled={isYear1}
            />
            <div className="selector-divider" />
            <SelectorGroup
              label="PARCOURS"
              options={[
                { value: "A", label: "A" },
                { value: "B", label: "B" },
              ]}
              active={config.parcours}
              onChange={v => onConfigChange({ parcours: v as Parcours })}
              disabled={isYear1}
            />
          </div>
        </div>
        <div className="header-right">
          <span className="status-dot" />
        </div>
      </div>
    </header>
  );
}
