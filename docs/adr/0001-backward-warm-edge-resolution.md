# Backward warm-edge resolution (no connection-graph access)

## Status

accepted

## Context

Warmline's core job is naming the **Warm intro** — the person in your network who can introduce you to a **Lead**. The obvious implementation is to read the LinkedIn connection graph and traverse 2nd/3rd-degree connections. That graph is not available:

- **Official LinkedIn API** does not expose the connection graph or 2nd-degree connections. `r_1st_connections` is compliance-only (granted solely for SEC/regulatory monitoring); "the connection graph (who knows whom)" is explicitly on the never-granted list. (Verified: Microsoft Learn LinkedIn Connections API docs; socialcrawl.dev "LinkedIn API in 2026", Jun 2026.)
- **Fiber** returns `connection_count` / `follower_count` as numbers only — no list, no mutuals. (Verified: Fiber `KitchenSinkProfile` / `peopleSearch` schemas, `api.fiber.ai/ai-docs`.)
- **Cookie/session scrapers** (Apify "LinkedIn Shared Connections", connectsafely.ai, LinkUp, OutX) can return mutuals/degree, but require automating your logged-in LinkedIn session — ToS violation, ban risk, and fragile. The leading Apify actor is 2.5★, 45 users, 81.7% run success, $25/mo, and its output is a count + search-link, not a clean named list. (Verified: apify.com/data_link_miner/linkedin-shared-connections.) The project brief also explicitly cuts ToS-risky live-session tooling.

## Decision

**Do not access the connection graph at all. Resolve the warm edge *backward* from each known Lead, not by traversing the network forward.**

Forward traversal (you → friends → their friends) needs the real graph and explodes to millions of nodes. Backward resolution tests a bridge between **two known endpoints** — a known Lead and your known 1st-degree connections — so it needs no graph:

For each **Lead**, check which of your real 1st-degree **Connections** (from the LinkedIn data export) links to them, via, in priority order:

1. **Shared company** — Lead's company (past/present) matched against your connections' `Position` history. Deterministic, free, instant. The workhorse.
2. **Observed engagement** — Fiber `postReactionsLiveFetch` / `postCommentsLiveFetch` on the Lead's posts, intersected with your connections. Sanctioned, ~1 credit, gives proof ("liked their post").
3. **Shared event** — both present in the `Config Leads SF 2026` attendee data.
4. **Shared school** — `Education.csv` overlap. Weak fallback.

Your half of every path (You → Connection) comes from the export: `Connections.csv` (3,942) for edges, `messages.csv` (17,426) for tie strength. For the 2–3 scripted hero-demo Leads, mutuals are hand-verified once from your own logged-in LinkedIn UI and seeded — no live call on stage.

## Consequences

- We never need 2nd/3rd-degree graph access; the "knowledge graph" is reconstructed per-Lead from shared attributes, not browsed.
- We **cannot** support open-ended network browsing ("show me everyone 3 hops out"). This is acceptable — it is not the product; the product is goal → Leads → who bridges to them.
- Edge quality depends on attribute overlap + Fiber engagement coverage, so each edge carries a confidence + a human-readable proof string surfaced in the `Why`.
- Per project policy, library/API capabilities behind these claims are re-verified via Context7/Exa before code depends on them.
