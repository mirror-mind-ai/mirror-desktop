import { isOperationalSurfaceAvailable } from "./journeySurfaceAvailability";

export type OperationalSurface = "chat" | "artifacts" | "ariad";

type OperationalWorkspaceSwitcherProps = {
  value: OperationalSurface;
  onChange: (surface: OperationalSurface) => void;
  disabled?: boolean;
};

const operationalSurfaces = [
  { id: "chat", label: "Conversation", icon: "◌", iconName: "conversation" },
  { id: "artifacts", label: "Artifacts", icon: "▱", iconName: "artifacts" },
  { id: "ariad", label: "Ariad", icon: "△", iconName: "ariad" },
] as const satisfies readonly {
  id: OperationalSurface;
  label: string;
  icon: string;
  iconName: string;
}[];

export function OperationalWorkspaceSwitcher({
  value,
  onChange,
  disabled = false,
}: OperationalWorkspaceSwitcherProps) {
  const selectedValue = isOperationalSurfaceAvailable(value) ? value : "chat";
  return (
    <div className="operational-workspace-switcher" role="tablist" aria-label="Operational workspace">
      {operationalSurfaces.filter(({ id }) => isOperationalSurfaceAvailable(id)).map((surface) => {
        const selected = surface.id === selectedValue;
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
            <span
              className="selector-option-icon"
              data-icon={surface.iconName}
              aria-hidden="true"
            >
              {surface.icon}
            </span>
            <span>{surface.label}</span>
          </button>
        );
      })}
    </div>
  );
}
