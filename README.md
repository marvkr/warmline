# Warmline

**The For You feed for your warm network.**

Everyone is automating *cold* outreach — more personalized spam, sent faster. It's a race to the bottom. Warmline plays the other game: the highest-converting lead you'll ever get is a **warm intro**, and the one you need is usually sitting **one person away** — invisible, because it's scattered across your Gmail, a cofounder's LinkedIn, and an event you both almost went to.

Tell Warmline your goal once. A proactive agent watches the connections you already have, surfaces the intro you didn't know existed, and tells you exactly **how** to make it land — channel, angle, and a drafted opener.

> Cold is a volume game everyone's racing to the bottom on. Warm is a knowledge game nobody's playing. We don't help you send more — we show you the door that was already open.

Built for the **YC AI Growth Hackathon** (24-hour build).

## What makes it different (not just another network search)

- **Proactive, not reactive** — it *pushes* the intro you didn't ask for, instead of waiting for you to search.
- **2nd / 3rd degree, not just mutuals** — finds the *gatekeeper* to befriend who unlocks many targets at once.
- **Serendipity layer** — fuses event RSVPs + live social signal into an attendance-confidence score ("will they actually be there?").
- **Per-person tailored ranking** — a For You feed pointed at people; thumbs-up / thumbs-down visibly reorders the list.

## How it works

- **Warm signal** — your own Google contacts / calendar (and Gmail) for genuine 1st-degree connections.
- **Reach & enrichment** — [Fiber](https://fiber.ai/) for live LinkedIn / X data, people & company search, and contact details across 2nd/3rd degree.
- **Proactive agent** — a Convex cron runs on a schedule, ranks leads against your stated goal, and traces the warm path.
- **Live network graph** — the hero view: on a query like "warm intro at Stripe?", the path lights up node-by-node (you → gatekeeper → target).
- **Why + How** — every lead ships with the reasoning and a drafted opener. Draft only — never auto-sent.
- **CSV export** — every CRM imports one, so one file replaces ten fragile integrations.

## How Convex powers Warmline

Convex isn't just a database here — it's the entire backend runtime. Every piece of server-side logic runs as a Convex function.

**Schema + typed queries**
The graph lives in Convex tables (`persons`, `edges`, `recommendations`, `icp`, `feedback`, `personVectors`) with explicit indexes (`by_role`, `by_from`, `by_to`, `by_icp_and_score`, etc.). All queries and mutations use the generated TypeScript bindings — no raw SQL, no ORMs, no drift between schema and types.

**Realtime subscriptions**
The feed (`api.feed.list`) is a Convex `query`. The React client subscribes via `useQuery` — when the daily cron re-ranks or the user thumbs up a row, the UI updates live with no polling or websocket plumbing.

**Actions for long-running work**
CPU-heavy work — scraping the product site (Firecrawl), deriving the ICP (OpenAI), embedding 120+ people (`text-embedding-3-small`), calling the Fiber people API — runs in Convex `action`s which have no 10 s timeout and can call external APIs directly from within the Convex runtime.

**Scheduled cron**
`convex/crons.ts` registers a daily job at 13:00 UTC that recomputes the bridge graph (`edges.computeEdges`) and re-ranks leads against the latest ICP (`rank.rebuild`). The entire pipeline — graph traversal → vector similarity → LLM judge → upsert recommendations — runs server-side on schedule with no external orchestrator.

**Vector index for goal-fit ranking**
`personVectors` has a `vectorIndex("by_embedding", { vectorField: "embedding", dimensions: 1536 })`. The ranker embeds the ICP text, runs a vector search across all person embeddings, then fuses cosine similarity with warm-reachability to produce the final score.

**File storage**
User-uploaded exports (LinkedIn ZIP, Twitter ZIP, Luma CSV, Instagram) are stored in Convex file storage. `connectors.generateUploadUrl` returns a signed PUT URL; the client uploads directly; `connectors.recordUpload` persists the `storageId` reference and triggers parsing.

**Auth**
`@convex-dev/auth` handles password-based sign-in with session tokens stored in Convex's own auth tables — no third-party auth service needed.

## Tech stack

- [Convex](https://convex.dev/) — backend, realtime, and cron / scheduled functions
- [Fiber](https://fiber.ai/) — live people / company data and signals
- [OpenAI](https://openai.com/) — LLM reasoning + embeddings for ranking
- [Next.js](https://nextjs.org/) + [React](https://react.dev/) — frontend
- [Tailwind](https://tailwindcss.com/) — UI
- [Better Design](https://better-design.com/) — design system and UI/UX
- [Convex Auth](https://labs.convex.dev/auth) — authentication

## Get started

```bash
npm install
npm run dev
```

Set the required keys in your environment (see `.env.example`):

- `FIBER_API_KEY` — get one at <https://fiber.ai/app/api>
- `OPENAI_API_KEY`
- Google OAuth credentials for warm-signal access

## Learn more

- [Convex docs](https://docs.convex.dev/) · [Convex Auth](https://labs.convex.dev/auth)
- [Fiber API docs](https://api.fiber.ai/docs/) — start at [`llms.txt`](https://api.fiber.ai/llms.txt)
