/**
 * CR112: the prompts the Canvas surface pre-fills into the composer. They are the part of this
 * feature that carries its value, so they are pure functions with their own tests rather than
 * strings buried in a component.
 *
 * The Journey's agent cannot read this repository and does not know what the Canvas tab is, so
 * every prompt is self-contained.
 *
 * Nothing here runs an agent. The composer receives text and the Navigator decides.
 */

import { CANVAS_FILE_NAME, CANVAS_INSTRUCTIONS_FILE_NAME } from "./journeyCanvas";

/** A long description must not be able to push the prohibitions down the prompt. */
export const CANVAS_BRIEFING_EXCERPT_MAX_CHARS = 600;

/**
 * These prompts are written in English, which pulls an agent towards answering in English even
 * when every document it just read is in another language, so the rule has to be explicit.
 *
 * The Journey's own description is the anchor because it is the one thing that always exists.
 * Measured on the registry: 4 of 21 Journeys carried a `JOURNEY.md` while every Journey carried a
 * description. CR105 measured that the briefing never reaches a Desktop turn, so the agent cannot
 * read it and the app has to carry it in.
 */
function languageRule(briefing?: string): string {
  const trimmed = briefing?.trim();
  if (!trimmed) {
    return `Language. Write everything in the language this Journey's own documents are written
in, not in the language of this request. Do not translate anything into English. If the Journey's
documents are in Portuguese, so is everything you write.`;
  }
  const excerpt = trimmed.length > CANVAS_BRIEFING_EXCERPT_MAX_CHARS
    ? `${trimmed.slice(0, CANVAS_BRIEFING_EXCERPT_MAX_CHARS)}…`
    : trimmed;
  return `Language. This Journey describes itself like this:

> ${excerpt}

Write everything in the language of that description and of this Journey's own documents, not in
the language of this request. Do not translate anything into English.`;
}

/**
 * What survived the pivot. These were never rules about workflow; they are rules about not
 * fabricating fact. The exploration proved the risk on itself twice, reading a monthly cadence
 * off a directory tree and misreading a closed cycle.
 *
 * `ArtifactMarkdown` renders headings of levels one to three, lists, tables, fenced code,
 * blockquotes and inline strong, emphasis and code. It renders no links at all, so link syntax
 * would survive as literal text on the surface.
 */
const drawingRules = `How to draw:

- Replace ${CANVAS_FILE_NAME} entirely each time. It is derived and disposable. Never let it be
the only witness to a fact, and never record state by editing it. If something changed, the place
to change it is the file that holds it.
- Draw only from this Journey's current files. Do not draw from our conversation, from your memory
of earlier sessions, or from old transport files.
- Do not infer anything from the shape of the directory tree. Folder names and counts suggest
patterns that are frequently wrong.
- A wrong canvas is worse than no canvas, because I will trust it. If you cannot tell what is
true, say so instead of drawing it.
- Use only: headings of level one to three, bullet and numbered lists, tables, fenced code,
blockquotes, and inline bold, italic and code. Do not use links of any kind; they will render as
literal text.
- Do not change anything else in this Journey.`;

export function composeCanvasTeachingPrompt(journeyName: string, briefing?: string): string {
  return `I want this Journey, ${journeyName}, to keep a durable drawing of what is happening in
it, in a file named exactly ${CANVAS_FILE_NAME} at the root of this Journey, beside JOURNEY.md.
Mirror Desktop renders that file in a Canvas tab. It assigns no meaning to what you draw there:
the shape is for you and me to decide, not for the app.

Before drawing anything, ask me what belongs on it, and tell me what you think belongs there based
on what this Journey actually holds. Then draw the first version.

From then on, keep the practice. When I ask for the state of this Journey, or when you have just
changed something the drawing shows, redraw ${CANVAS_FILE_NAME} instead of answering only in the
conversation.

Record that practice in a file named exactly ${CANVAS_INSTRUCTIONS_FILE_NAME}, also at the root of
this Journey, so it survives this session. Keep it short: what to draw and when to redraw. It is a
standing note to yourself, not a specification of layout, and I would rather it stayed a few
paragraphs than grew into a document.

A file at the root is not enough on its own, because nothing loads it automatically. So also make
whatever instructions you actually load for this Journey point at
${CANVAS_INSTRUCTIONS_FILE_NAME}, in one line, wherever that place is for you. Then tell me where
you put both the file and the pointer, so I know where to edit them later.

${drawingRules}

${languageRule(briefing)}`;
}

export function composeCanvasRedrawPrompt(journeyName: string, briefing?: string): string {
  return `Please redraw the canvas for this Journey, ${journeyName}.

Read ${CANVAS_INSTRUCTIONS_FILE_NAME} at the root of this Journey and follow it. Then rewrite
${CANVAS_FILE_NAME} entirely, from this Journey's current files.

If ${CANVAS_INSTRUCTIONS_FILE_NAME} does not exist, do not guess at what the drawing should hold.
Tell me it is missing, draw from what ${CANVAS_FILE_NAME} already shows if it exists, and ask me
what belongs there.

${drawingRules}

${languageRule(briefing)}`;
}
