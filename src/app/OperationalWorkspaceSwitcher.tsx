export type OperationalSurface = "chat" | "artifacts";

type OperationalWorkspaceSwitcherProps = {
  value: OperationalSurface;
  onChange: (surface: OperationalSurface) => void;
  disabled?: boolean;
};

const operationalSurfaces = [
  { id: "chat", label: "Conversation" },
  { id: "artifacts", label: "Artifacts" },
] as const satisfies readonly { id: OperationalSurface; label: string }[];

export function OperationalWorkspaceSwitcher({
  value,
  onChange,
  disabled = false,
}: OperationalWorkspaceSwitcherProps) {
  return (
    <div className="operational-workspace-switcher" role="tablist" aria-label="Operational workspace">
      {operationalSurfaces.map((surface) => {
        const selected = surface.id === value;
        return (
          <button
            key={surface.id}
            className={`operational-workspace-option ${selected ? "selected" : ""}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={disabled}
            aria-controls={`operational-${surface.id}-panel`}
            disabled={disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(surface.id)}
          >
            {surface.label}
          </button>
        );
      })}
    </div>
  );
}
