# Validation — CV-007.DS-004

## Status

pending_navigator_validation

## Summary

Exact release readings now flow from canonical notes into updater manifests, pre-update review, bounded channel-local post-relaunch recognition and acknowledgement. Navigator feedback replaced compact `what's new` text with an accessible visual unread indicator, retained release-note access in the chip after Got it and made the update-available indicator persist after Later. Focused tests, roadmap consistency and the frontend build pass; Mirror Desktop Dev remains the validation surface.

## Navigator Feedback Applied

- The compact version chip uses `✦` with the accessible label `Unread release notes` instead of textual `what's new` status.
- Got it removes only unread emphasis. The acknowledged chip popover and Settings still expose the current release notes.
- Later closes an available-update popover without suppressing the persistent amber update indicator.

## Child Work Packages

- CV-007.DS-004.TS-1
- CV-007.DS-004.US-1
- CV-007.DS-004.US-2
- CV-007.DS-004.TS-2

## Boundary

Do not proceed to DS-level Debt Review until Navigator validation is accepted.
