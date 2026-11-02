import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JourneyThreadState } from "../app/JourneyThreadState";
import { otherBuildRefusal, OTHER_BUILD_REFUSAL } from "../domain/otherBuildRefusal";
import appSource from "../app/App.tsx?raw";
import mainSource from "../../src-tauri/src/main.rs?raw";

// CR168: a conversation made by the other build is not a broken record. The native refusal names
// both builds; the screen says so and keeps "needs recovery" for records that really are invalid.

const refusal = "This conversation belongs to another Mirror Desktop build: it was made by the development build, and this is the user build.";

describe("a conversation made by the other build", () => {
  it("is recognized from the native refusal, and nothing else is", () => {
    expect(mainSource).toContain(`"${OTHER_BUILD_REFUSAL}: it was made by the {} build, and this is the {} build."`);
    expect(otherBuildRefusal(refusal)).toBe(refusal);
    expect(otherBuildRefusal(new Error(refusal))).toBe(refusal);
    expect(otherBuildRefusal("Stored Journey thread authority is invalid.")).toBeUndefined();
    expect(otherBuildRefusal(undefined)).toBeUndefined();
  });

  it("is shown as the other build's, not as needing recovery", () => {
    const html = renderToStaticMarkup(
      <JourneyThreadState journeyName="Mirror Desktop" state={{ kind: "unavailable", reason: "other_build", message: refusal }} />,
    );
    expect(html).toContain("This conversation belongs to another Mirror Desktop build");
    expect(html).toContain(refusal);
    expect(html).toContain("Open it in the build that made it. Nothing was changed.");
    expect(html).not.toContain("needs recovery");
    expect(html).not.toContain("invalid_record");
  });

  it("is told apart where the conversation is loaded, before any other reading of the failure", () => {
    const start = appSource.indexOf("async function restoreConversation()");
    const body = appSource.slice(start, appSource.indexOf("void restoreConversation();", start));
    const caught = body.slice(body.lastIndexOf("} catch (error) {"));
    expect(caught).toContain("const otherBuild = otherBuildRefusal(error);");
    expect(caught.indexOf("otherBuild ?")).toBeLessThan(caught.indexOf("threadAuthorityLoaded"));
  });
});
