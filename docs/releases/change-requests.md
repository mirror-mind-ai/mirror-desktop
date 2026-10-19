# Change Requests by Release

Which Change Request each release carried. `canvas.md` is derived and keeps only the three most
recent deliveries, so this file is the durable record the Canvas reads from.

**Recovered on 2026-10-18 from the Canvas table, which was the only place this mapping existed.**
The release notes under `docs/releases/` name no Change Request at all, so a delivery's release
could not be read from them. **This is not a complete history**: it holds the fifteen entries the
Canvas carried, not every CR ever delivered. Earlier mappings are recoverable by diffing
`docs/project/refinement/index.md` between consecutive release tags and reading which rows turned
`done`; that has not been done, and the gap is stated rather than filled.

| CR | Title | Story | Release |
| --- | --- | --- | --- |
| CR129 | Let a Recovered Settlement Say It Happened | RS016 | alpha.55 |
| CR158 | Stop One Agent Settings Write From Dropping Another | RS016 | alpha.55 |
| CR162 | Stop a Table Cell From Painting Over Its Neighbour | RS016 | alpha.54 |
| CR160 | Notice a Turn the Journal Never Heard Finish | RS025 | alpha.52 |
| CR145 | Let a Finished Pi Release the Turn It Completed | RS016 | alpha.45 |
| CR144 | Stop a Running Turn from Disabling Its Sibling's Send | RS024 | alpha.44 |
| CR143 | Say Which Conversation Is Working | RS024 | alpha.44 |
| CR142 | Stop Losing a Turn the Journal Already Answered | RS016 | alpha.45 |
| CR141 | Key the Pi Event Route by Workspace | RS024 | alpha.44 |
| CR140 | Name the Constraint That Refuses Concurrent Work | RS024 | alpha.44 |
| CR139 | Key the Native Registry by Workspace | RS024 | alpha.44 |
| CR138 | Let the Inspection Carry Two Workspaces in One Journey | RS024 | alpha.44 |
| CR135 | Let the Navigator Hide a Conversation Without Deleting It | RS023 | alpha.43 |
| CR134 | Name the Owner of Running Work Without Hiding That It Runs | RS023 | alpha.43 |
| CR133 | Stop a Disclosure From Selecting a Journey | RS023 | alpha.43 |
| CR132 | Let the Navigator End a Finishing That Will Not End | RS016 | alpha.42 |
| CR130 | Stop Offering a Journey Edit That Cannot Succeed | RS021 | alpha.41 |
| CR127 | Let a Journey's First Turn Settle Without a Receipt It Cannot Have | RS016 | alpha.42 |
