import { z } from "zod";

export const identitySchema = z.object({
  name: z.literal("Nautilus"),
  method_version: z.literal("0.1.0-experimental"),
  protocol_version: z.literal("0.1.0"),
  schema_version: z.literal("0.1.0"),
  grammar_status: z.literal("experimental"),
  compatibility: z.literal("compatible"),
});

export const missionSchema = z.object({
  id: z.literal("mission-001"),
  title: z.literal("Formulate the first Nautilus mission"),
  purpose: z.literal("Prove that Nautilus can name a directed intention before execution."),
  status: z.literal("formulated"),
});

export const nautilusMissionDocumentSchema = identitySchema.extend({
  mission: missionSchema,
});

export type NautilusIdentity = z.infer<typeof identitySchema>;
export type NautilusMission = z.infer<typeof missionSchema>;
export type NautilusMissionDocument = z.infer<typeof nautilusMissionDocumentSchema>;
