export const applicationThemes = [
  { id: "channel", label: "Channel default", colors: ["#85dfd2", "#101b1f", "#0d1011"] },
  { id: "tide", label: "Tide", colors: ["#69d7df", "#102b39", "#0a151b"] },
  { id: "violet", label: "Violet", colors: ["#c18af0", "#2b1638", "#130b1b"] },
  { id: "ember", label: "Ember", colors: ["#f0a06b", "#3a2019", "#1a100d"] },
] as const;

export type ApplicationTheme = (typeof applicationThemes)[number]["id"];

export function parseApplicationTheme(value: unknown): ApplicationTheme | undefined {
  return applicationThemes.some((theme) => theme.id === value) ? value as ApplicationTheme : undefined;
}
