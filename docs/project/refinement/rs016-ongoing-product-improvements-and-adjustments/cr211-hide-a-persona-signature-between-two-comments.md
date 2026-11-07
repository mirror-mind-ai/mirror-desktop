[< RS016](index.md)

# CR211: Hide a Persona Signature Between Two Comments

**Status:** in_progress
**Driver:** assistant
**Delivery:** `main` (`6d5d0b3f`)
**Reported:** Navigator, 2026-11-07 ("ainda estamos tendo aquele problema de vazamento do nome da persona com o ícone de losango"); follow-up to CR188

## Friction

The "◇ <persona>" signature still showed inside some answers.

## Cause

The Core asks the model to `sign ◇ <persona>`. The model signs first or last, and sometimes at the
start of a second text block written right after the first. The stream joins the two blocks into
one comment, so the signature sits in the middle. CR188 removed it only on the first or last line.

Measured on production copies (read only): the models signed 691 distinct answers since 2026-11-01;
passed through the real presentation, one showed a signature, the shape above (2026-11-06, the
icon conversion turn). Live turns can show it more often, while the two blocks are still streaming.

## Change

A line that is only `◇ <persona-id>` is removed wherever it is, with the blank line after it,
except inside a fenced code block. A diamond in a sentence, or followed by words that are not a
persona id, stays. After the change the 691 answers show none.

## Check

Over a few days of ordinary use, no answer shows a line with only "◇ <persona>", during the turn or
after it.
