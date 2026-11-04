import type { AppExtensions } from "../domain/appExtensions";

const extensionDescriptors = [
  {
    key: "agentField",
    name: "Agent Field",
    description: "A partial view of what effectively entered the agent's context in this Conversation.",
  },
  {
    key: "agentCanvas",
    name: "Agent Canvas",
    description: "The drawing the Journey's agent keeps of its work, as the Journey decided to draw it.",
  },
] as const satisfies readonly { key: keyof AppExtensions; name: string; description: string }[];

/**
 * CV-012.DS-001: Settings › Extensions. Each switch shows or hides its tab beside Conversation.
 * The state carries text as well as tint, under CR102's rule, like the sound switch.
 */
export function ExtensionsSettings({
  value,
  onChange,
}: {
  value: AppExtensions;
  onChange: (next: AppExtensions) => void;
}) {
  return (
    <>
      <section className="settings-section extensions-intro" aria-label="About extensions">
        <h3>Extensions</h3>
        <p>
          Extensions are still being built. The app will keep a small core (Journeys, personas and
          their conversations), and everything else will be an extension you install and turn on or
          off.
        </p>
        <p>
          The options below are a bridge from what exists today to how it will work: two functions
          the app already has, shown only if you turn them on. Each one adds a tab beside
          Conversation.
        </p>
      </section>
      {extensionDescriptors.map((extension) => {
        const on = value[extension.key];
        return (
          <section className="settings-section extension-card" aria-label={extension.name} key={extension.key}>
            <h3>{extension.name}</h3>
            <p className="settings-sound-hint">{extension.description}</p>
            <button
              className={`settings-sound-toggle${on ? " is-on" : ""}`}
              type="button"
              onClick={() => onChange({ ...value, [extension.key]: !on })}
              aria-pressed={on}
              title={on ? `Turn ${extension.name} off` : `Turn ${extension.name} on`}
            >
              <span aria-hidden="true">{on ? "◆" : "◇"}</span>
              <span>{on ? "On" : "Off"}</span>
            </button>
          </section>
        );
      })}
    </>
  );
}
