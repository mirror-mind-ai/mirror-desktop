export type ApplicationThemeFamily = "dark" | "light";

type LightThemeTokens = {
  canvas: string;
  surface: string;
  raisedSurface: string;
  primaryText: string;
  mutedText: string;
  accentText: string;
};

export const applicationThemes = [
  { id: "channel", label: "Default", family: "dark", colors: ["#85dfd2", "#101b1f", "#0d1011"] },
  { id: "tide", label: "Tide", family: "dark", colors: ["#69d7df", "#102b39", "#0a151b"] },
  { id: "violet", label: "Violet", family: "dark", colors: ["#c18af0", "#2b1638", "#130b1b"] },
  { id: "ember", label: "Ember", family: "dark", colors: ["#f0a06b", "#3a2019", "#1a100d"] },
  { id: "forest", label: "Forest", family: "dark", colors: ["#8fd694", "#1d3427", "#0d1812"] },
  { id: "slate", label: "Slate", family: "dark", colors: ["#a9bac2", "#263039", "#11171b"] },
  {
    id: "daylight",
    label: "Daylight",
    family: "light",
    colors: ["#0f766e", "#f0f2f5", "#ffffff"],
    tokens: {
      canvas: "#f6f7f9",
      surface: "#ffffff",
      raisedSurface: "#f0f2f5",
      primaryText: "#1f2937",
      mutedText: "#667085",
      accentText: "#0f766e",
    },
  },
  {
    id: "mist",
    label: "Mist",
    family: "light",
    colors: ["#285d91", "#edf3f8", "#ffffff"],
    tokens: {
      canvas: "#f4f8fc",
      surface: "#ffffff",
      raisedSurface: "#edf3f8",
      primaryText: "#182536",
      mutedText: "#526579",
      accentText: "#285d91",
    },
  },
  {
    id: "parchment",
    label: "Parchment",
    family: "light",
    colors: ["#6e4d25", "#f4eddc", "#fffdf7"],
    tokens: {
      canvas: "#fbf7ed",
      surface: "#fffdf7",
      raisedSurface: "#f4eddc",
      primaryText: "#302a20",
      mutedText: "#665b4b",
      accentText: "#6e4d25",
    },
  },
] as const;

export type ApplicationTheme = (typeof applicationThemes)[number]["id"];
export type ApplicationThemeDescriptor = (typeof applicationThemes)[number];
export type LightApplicationTheme = Extract<ApplicationThemeDescriptor, { family: "light" }> & { tokens: LightThemeTokens };

export const applicationThemeGroups = (["dark", "light"] as const).map((family) => ({
  family,
  label: family === "dark" ? "Dark" : "Light",
  themes: applicationThemes.filter((theme) => theme.family === family),
}));

export const lightApplicationThemes = applicationThemes.filter(
  (theme): theme is LightApplicationTheme => theme.family === "light",
);

export function parseApplicationTheme(value: unknown): ApplicationTheme | undefined {
  return applicationThemes.some((theme) => theme.id === value) ? value as ApplicationTheme : undefined;
}
