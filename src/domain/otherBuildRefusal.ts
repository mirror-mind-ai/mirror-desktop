/**
 * CR168: how the native side refuses a conversation made by the other Mirror Desktop build (the
 * user build or the development build). It is not a broken record, so it is not shown as one.
 */
export const OTHER_BUILD_REFUSAL = "This conversation belongs to another Mirror Desktop build";

/** The refusal's sentence when `error` is that refusal; otherwise undefined. */
export function otherBuildRefusal(error: unknown): string | undefined {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  return message?.startsWith(`${OTHER_BUILD_REFUSAL}:`) ? message : undefined;
}
