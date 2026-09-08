import type { KeyboardEvent } from "react";

export const settingsTabs = [
  { id: "appearance", label: "Appearance" },
  { id: "user-profile", label: "User Profile" },
  { id: "agent", label: "Agent" },
  { id: "runtime", label: "Runtime" },
  { id: "updates", label: "Updates" },
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
