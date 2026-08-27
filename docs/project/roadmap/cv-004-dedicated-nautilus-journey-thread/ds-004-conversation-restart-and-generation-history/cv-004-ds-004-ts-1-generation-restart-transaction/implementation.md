# Implementation — CV-004.DS-004.TS-1

Implemented a durable model-free restart transaction in the Tauri boundary. It reserves the contiguous next generation, provisions one exact Pi/Mirror pair, verifies activation, and atomically publishes prior closure plus replacement activation. Failure before publication leaves prior authority intact; retries and post-publication residue converge without duplicate pairs.

The existing empty Pi session v3 adapter remains isolated, directory-confined, create/read-back verified and covered by characterization tests because Pi RPC removes empty session files after settlement.
