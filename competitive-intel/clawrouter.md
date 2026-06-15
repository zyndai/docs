# ClawRouter — competitive intel

Source repo: [`BlockRunAI/ClawRouter`](https://github.com/BlockRunAI/ClawRouter)

| Date | Release | Summary | Source |
|---|---|---|---|
| 2026-04-21 | v0.12.159 | - **Market data tools** — BlockRun gateway now exposes realtime and historical market data; ClawRouter wires them into OpenClaw as 6 first-class agent tools so the model stops scraping finance sites. Paid ($0.001 via x402, same wallet as LLM calls): `blockrun_stock_price` and `bl... | [v0.12.159](https://github.com/BlockRunAI/ClawRouter/releases/tag/v0.12.159) |
| 2026-04-20 | v0.12.158 | - **SKILL.md data-flow + key-storage transparency** — second-pass fix for the OpenClaw scanner on clawhub.ai. v0.12.157 cleared the original scanner flags (opaque credentials, implied multi-provider keys, no install artifact). A deeper rescan surfaced three new nuanced flags: pro... | [v0.12.158](https://github.com/BlockRunAI/ClawRouter/releases/tag/v0.12.158) |
| 2026-04-20 | v0.12.157 | - **SKILL.md credential transparency** — rewrote `skills/clawrouter/SKILL.md` to clear the OpenClaw scanner's medium-confidence suspicious verdict on clawhub.ai. Frontmatter now declares `repository: https://github.com/BlockRunAI/ClawRouter`, `license: MIT`, and a structured `met... | [v0.12.157](https://github.com/BlockRunAI/ClawRouter/releases/tag/v0.12.157) |
| 2026-04-20 | v0.12.156 | ## v0.12.156 — Apr 20, 2026 - **Kimi K2.6 added** — Moonshot's new flagship (`moonshot/kimi-k2.6`, 256K context, vision + reasoning, $0.95 in / $4.00 out per 1M) registered in `BLOCKRUN_MODELS` with `kimi-k2.6` alias. Added to the curated `/model` picker list (`src/index.ts`, `sc... | [v0.12.156](https://github.com/BlockRunAI/ClawRouter/releases/tag/v0.12.156) |
