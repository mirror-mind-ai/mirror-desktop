import { isOperationalSurfaceShown } from "./journeySurfaceAvailability";
import { DEFAULT_APP_EXTENSIONS, type AppExtensions } from "../domain/appExtensions";

export type OperationalSurface = "chat" | "artifacts" | "canvas" | "ariad";

type OperationalWorkspaceSwitcherProps = {
  value: OperationalSurface;
  onChange: (surface: OperationalSurface) => void;
  disabled?: boolean;
  /** CV-012.DS-001: which of the extensions the person turned on. */
  extensions?: Readonly<AppExtensions>;
};

const operationalSurfaces = [
  { id: "chat", label: "Conversation", icon: "◌", iconName: "conversation" },
  // CR105: the surface stopped being a list of artifacts and became a partial view of what
  // effectively entered the agent's context. The id stays `artifacts` because it is persisted
  // selection state, not a label. Field and territory went back to the Nautilus method.
  // CV-012.DS-001: renamed Agent Field, the Nautilus framework's name for it (Navigator, 2026-11-04).
  { id: "artifacts", label: "Agent Field", icon: "▱", iconName: "artifacts" },
  // CR112: the drawing the Journey's agent keeps, hosted rather than computed, and deliberately
  // not named by genre. Context Map answers what entered this Conversation; Agent’s Canvas shows
  // whatever the Journey decided deserves to be drawn.
  { id: "canvas", label: "Agent Canvas", icon: "▤", iconName: "canvas" },
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
  extensions = DEFAULT_APP_EXTENSIONS,
}: OperationalWorkspaceSwitcherProps) {
  const shown = operationalSurfaces.filter(({ id }) => isOperationalSurfaceShown(id, extensions));
  // CV-012.DS-001: a switcher with one tab offers no choice, so it is not drawn.
  if (shown.length <= 1) return null;
  const selectedValue = isOperationalSurfaceShown(value, extensions) ? value : "chat";
  return (
    <div className="operational-workspace-switcher" role="tablist" aria-label="Operational workspace">
      {shown.map((surface) => {
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
