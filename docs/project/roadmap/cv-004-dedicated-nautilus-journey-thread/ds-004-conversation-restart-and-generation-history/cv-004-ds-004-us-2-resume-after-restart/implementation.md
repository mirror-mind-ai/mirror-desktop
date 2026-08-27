# Implementation — CV-004.DS-004.US-2

Journey restoration now reads the thread's exact `activeGeneration`, loads that generation's namespaced Harness projection and exact Pi transcript, and creates an empty dedicated projection when none exists. Inactive generations remain bounded read-only history and cannot become current through name, timestamp, recency or conversation selection.
