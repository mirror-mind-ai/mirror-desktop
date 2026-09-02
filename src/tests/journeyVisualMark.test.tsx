import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyVisualMark } from "../app/JourneyVisualMark";
import storageSource from "../app/journeyAppearanceStorage.ts?raw";
import nativeSource from "../../src-tauri/src/journey_appearance.rs?raw";
import tauriMainSource from "../../src-tauri/src/main.rs?raw";


describe("Journey visual mark", () => {
  it("renders curated system appearance while retaining runtime evidence", () => {
    const html = renderToStaticMarkup(
      <JourneyVisualMark
        journeyId="journey-one"
        appearance={{ kind: "system", icon: "book" }}
        fallbackGlyph="•"
        runtimePhase="running"
      />,
    );
    expect(html).toContain("▤");
    expect(html).toContain('data-runtime-phase="running"');
    expect(html).toContain("journey-visual-activity");
  });

  it("shows transparent custom pixels over a neutral surface instead of a theme tint", () => {
    const html = renderToStaticMarkup(
      <JourneyVisualMark journeyId="journey-one" appearance={{ kind: "custom" }} fallbackGlyph="•" />,
    );
    expect(html).toContain("background-color:#101719");
    expect(html).toContain("border-color:rgba(255, 255, 255, 0.16)");
  });

  it("keeps external paths out of the frontend overlay boundary", () => {
    expect(storageSource).toContain('invoke<string | null>("import_journey_custom_image", { journeyId })');
    expect(storageSource).toContain("PNG_DATA_URL");
    expect(storageSource).not.toContain("sourcePath");
  });

  it("normalizes only approved formats into app-controlled square PNG files", () => {
    expect(nativeSource).toContain("MAX_SOURCE_BYTES: u64 = 5 * 1024 * 1024");
    expect(nativeSource).toContain("ImageFormat::Png | ImageFormat::Jpeg | ImageFormat::WebP");
    expect(nativeSource).toContain("resize_to_fill(IMAGE_SIZE, IMAGE_SIZE");
    expect(nativeSource).toContain('const IMAGE_SIZE: u32 = 512');
    expect(nativeSource).toContain('const APPEARANCE_DIRECTORY: &str = "journey-appearance"');
    expect(nativeSource).toContain("MAX_CUSTOM_IMAGES: usize = 32");
    expect(tauriMainSource).toContain("import_journey_custom_image");
    expect(tauriMainSource).toContain("load_journey_custom_image");
    expect(tauriMainSource).toContain("remove_journey_custom_image");
  });
});
