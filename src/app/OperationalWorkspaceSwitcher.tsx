import { isOperationalSurfaceAvailable } from "./journeySurfaceAvailability";

export type OperationalSurface = "chat" | "artifacts" | "workflow" | "ariad";

type OperationalWorkspaceSwitcherProps = {
  value: OperationalSurface;
  onChange: (surface: OperationalSurface) => void;
  disabled?: boolean;
};

const operationalSurfaces = [
  { id: "chat", label: "Conversation", icon: "◌", iconName: "conversation" },
  // CR105: the surface stopped being a list of artifacts and became a partial view of what
  // effectively entered the agent's context. The id stays `artifacts` because it is persisted
  // selection state, not a label. Field and territory went back to the Nautilus method.
  { id: "artifacts", label: "Context", icon: "▱", iconName: "artifacts" },
  // CR112: what the Journey declares about its own work, hosted rather than computed. Context
  // answers what entered this Conversation; Workflow answers what the Journey says its work is.
  { id: "workflow", label: "Workflow", icon: "▤", iconName: "workflow" },
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
