/**
 * CV-010.DS-005 slice 3a: the name a new Mirror home is created with.
 *
 * The core keys a person's identity on a user name, a kebab-case slug, and the doorman reads it
 * back from the home folder's name, so the folder is named with it. The setup screen derives it
 * from the name the person types ("Ana Souza" → `ana-souza`) and lets them edit it; these rules
 * are the core's (`kebabSlug`, `isKebabSlug`), so a name shown as valid here is one it accepts.
 */

export const USER_NAME_MAX_LENGTH = 80;
/** Where a home is created unless the person chooses another folder, as the screen shows it. */
export const DEFAULT_HOMES_FOLDER_LABEL = "~/Mirror";

const USER_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The user name for what the person typed: accents dropped, lowercase, other runs as one hyphen. */
export function userNameFrom(text: string): string {
  const slug = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.slice(0, USER_NAME_MAX_LENGTH).replace(/-+$/g, "");
}

export function isUserName(value: string): boolean {
  return value.length <= USER_NAME_MAX_LENGTH && USER_NAME.test(value);
}

/** What is wrong with `userName`, in the screen's words, or null. */
export function userNameProblem(userName: string): string | null {
  if (userName.length === 0) return "Type a name for your Mirror.";
  if (isUserName(userName)) return null;
  return "Use lowercase letters, digits and single hyphens, up to 80 characters.";
}

/** The folder the home will be, as the screen shows it before creating. */
export function homeCreationPreview(userName: string, folder?: string): string {
  return `${folder ?? DEFAULT_HOMES_FOLDER_LABEL}/${userName}`;
}
