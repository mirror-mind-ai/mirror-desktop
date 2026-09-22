// CR076 bounds decision, shared by live capture and Pi-session reconstruction
// (CR077) so both paths yield the same bounded artifact for a turn's reasoning.
// Bounds are measured in UTF-16 code units; truncation and elision stay visible.
export const REASONING_BLOCK_MAX_CHARS = 8192;
export const REASONING_TURN_MAX_CHARS = 65536;

export type BoundedReasoningBlock = {
  content: string;
  truncated?: true;
  elided?: true;
};

export function boundReasoningBlocks(texts: string[]): BoundedReasoningBlock[] {
  let captured = 0;
  return texts.map((text) => {
    if (captured >= REASONING_TURN_MAX_CHARS) {
      return { content: "", elided: true };
    }
    const remaining = Math.min(REASONING_BLOCK_MAX_CHARS, REASONING_TURN_MAX_CHARS - captured);
    const content = text.slice(0, remaining);
    captured += content.length;
    return {
      content,
      ...(text.length > content.length ? { truncated: true as const } : {}),
    };
  });
}
