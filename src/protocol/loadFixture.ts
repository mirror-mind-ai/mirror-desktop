import { ZodError } from "zod";
import { nautilusMissionDocumentSchema, type NautilusMissionDocument } from "./schema";

export type FixtureValidation =
  | { ok: true; document: NautilusMissionDocument }
  | { ok: false; errors: string[] };

export function parseSimpleYaml(source: string): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  let currentSection: Record<string, string> | undefined;

  source.split(/\r?\n/).forEach((rawLine, index) => {
    if (!rawLine.trim() || rawLine.trimStart().startsWith("#")) {
      return;
    }

    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trim();
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`line ${index + 1}: expected 'key: value'`);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!key) {
      throw new Error(`line ${index + 1}: key is required`);
    }

    if (indent === 0) {
      if (value === "") {
        currentSection = {};
        parsed[key] = currentSection;
      } else {
        parsed[key] = value;
        currentSection = undefined;
      }
      return;
    }

    if (indent === 2 && currentSection) {
      if (!value) {
        throw new Error(`line ${index + 1}: nested value is required`);
      }
      currentSection[key] = value;
      return;
    }

    throw new Error(`line ${index + 1}: unsupported indentation for Nautilus fixture`);
  });

  return parsed;
}

export function validateMissionFixture(source: string): FixtureValidation {
  try {
    const parsed = parseSimpleYaml(source);
    return { ok: true, document: nautilusMissionDocumentSchema.parse(parsed) };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, errors: error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`) };
    }
    if (error instanceof Error) {
      return { ok: false, errors: [error.message] };
    }
    return { ok: false, errors: ["Unknown fixture validation error"] };
  }
}
