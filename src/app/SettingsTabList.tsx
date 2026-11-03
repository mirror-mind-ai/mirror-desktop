import type { KeyboardEvent } from "react";

export const settingsTabs = [
  // CR175: one tab per question the person brings, instead of one per part of the machine. Models
  // is who you talk to, Mirror is where your Mirror lives and what it learns, You is how it sees and
  // shows you, Diagnostics is what is running. Ids changed with the contents, since a kept id would
  // name a panel that no longer holds what it says.
  { id: "models", label: "Models" },
  { id: "mirror", label: "Mirror" },
  { id: "you", label: "You" },
  // CR151: renamed at the Navigator's request after the completion-sound settings moved here; the
  // id was kept, since only the label moved.
  { id: "voice", label: "Sound & Voice" },
  { id: "updates", label: "Updates" },
  { id: "diagnostics", label: "Diagnostics" },
] as const;

export type SettingsTab = (typeof settingsTabs)[number]["id"];

type SettingsTabListProps = {
  selected: SettingsTab;
  onSelect: (tab: SettingsTab) => void;
};

export function nextSettingsTab(current: SettingsTab, key: string): SettingsTab {
  const index = settingsTabs.findIndex((tab) => tab.id === current);
  if (key === "Home") return settingsTabs[0].id;
  if (key === "End") return settingsTabs[settingsTabs.length - 1].id;
  if (key === "ArrowRight" || key === "ArrowDown") return settingsTabs[(index + 1) % settingsTabs.length].id;
  if (key === "ArrowLeft" || key === "ArrowUp") return settingsTabs[(index - 1 + settingsTabs.length) % settingsTabs.length].id;
  return current;
}

export function SettingsTabList({ selected, onSelect }: SettingsTabListProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = nextSettingsTab(selected, event.key);
    if (next === selected) return;
    event.preventDefault();
    const tabList = event.currentTarget;
    onSelect(next);
    requestAnimationFrame(() => {
      tabList.querySelector<HTMLButtonElement>(`[data-settings-tab="${next}"]`)?.focus();
    });
  }

  return (
    <div className="settings-tab-list" role="tablist" aria-label="Settings sections" onKeyDown={handleKeyDown}>
      {settingsTabs.map((tab) => (
        <button
          className={selected === tab.id ? "selected" : ""}
          id={`settings-tab-${tab.id}`}
          data-settings-tab={tab.id}
          type="button"
          role="tab"
          aria-selected={selected === tab.id}
          aria-controls={`settings-panel-${tab.id}`}
          tabIndex={selected === tab.id ? 0 : -1}
          onClick={() => onSelect(tab.id)}
          key={tab.id}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
