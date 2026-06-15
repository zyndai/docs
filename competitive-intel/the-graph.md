# The Graph — competitive intel

Source repo: [`graphprotocol/graph-node`](https://github.com/graphprotocol/graph-node)

| Date | Release | Summary | Source |
|---|---|---|---|
| 2026-06-03 | v0.44.0 | ``` $ docker pull graphprotocol/graph-node:v0.44.0 ``` ### Critical Fix - **`EntityCache::load_related` returned wrong derived-collection membership on same-block parent reassignment.** Membership was decided against intermediate cache layers rather than the entity's final state,... | [v0.44.0](https://github.com/graphprotocol/graph-node/releases/tag/v0.44.0) |
| 2026-04-23 | v0.43.0 | ``` $ docker pull graphprotocol/graph-node:v0.43.0 ``` ### What's New - **`skipDuplicates` for immutable entities.** A new `skipDuplicates` parameter on the `@entity` directive (`@entity(immutable: true, skipDuplicates: true)`) silently skips duplicate inserts instead of failing ... | [v0.43.0](https://github.com/graphprotocol/graph-node/releases/tag/v0.43.0) |
| 2026-03-25 | v0.42.1 | ## Bug Fixes - Fixed multi-shard deployments becoming unresponsive due to `mirror_primary_tables` holding locks indefinitely, exhausting the connection pool. Added `statement_timeout` and `lock_timeout` to prevent stuck queries from cascading into a full lockup. (#6446) - Fixed t... | [v0.42.1](https://github.com/graphprotocol/graph-node/releases/tag/v0.42.1) |
| 2026-03-19 | v0.42.0 | ``` $ docker pull graphprotocol/graph-node:v0.42.0 ``` ### Breaking Changes - **Substreams support removed.** Substreams have been unsupported on the network for some time. All substreams-related code has been removed, simplifying the codebase significantly. Substreams-based subg... | [v0.42.0](https://github.com/graphprotocol/graph-node/releases/tag/v0.42.0) |
