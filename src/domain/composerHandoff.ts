/**
 * What the composer holds as a sent message changes hands with the agent.
 *
 * On send the visible composer is cleared, while the stored draft keeps the sent message until the
 * agent has it, so a crash before admission does not lose it. The person may type meanwhile; what
 * they type is theirs and is never taken by the handoff.
 */

/**
 * CR181: the owner's stored draft once the agent has the message. The stored copy of the sent
 * message goes; anything else is what the person typed since, and stays.
 */
export function draftAfterAdmission(stored: string | undefined, sent: string): string {
  if (stored === undefined || stored.trim() === sent.trim()) return "";
  return stored;
}

/**
 * CR183: the owner's draft after a turn cancelled before any answer. The message comes back; what
 * the person typed since stays after it.
 */
export function draftAfterUnansweredCancel(current: string, sent: string): string {
  if (!current.trim() || current.trim() === sent.trim()) return sent;
  return `${sent}\n\n${current}`;
}
