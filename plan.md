# Warmline — Build Plan (grill session output)

> **Status:** living doc from the planning/grill session. Decisions marked **PROPOSED** are my recommendations awaiting team sign-off; **OPEN** = unresolved fork we still need to answer. Nothing here is built yet — repo is a fresh Convex + Next.js + Convex Auth starter (empty schema except an auth + `numbers` placeholder).

**Product:** "For You feed for your warm network." Proactive agent that surfaces the connectors / high-value people you should reach out to against a stated goal, each with a **why** + **how** (channel + angle + drafted opener). Hero visual = live animated network graph (you → connector → target).

**Event:** YC AI Growth Hackathon, 24h build. Judged on **Cool** (motion), **Useful** (a growth person acts on it), **Technical** (one ownable hard thing).

---

## The wedges (do NOT drift into a Happenstance clone)

1. **Proactive, not reactive** — pushes the intro you didn't ask for. *Primary wedge, lead with it.*
2. **2nd/3rd degree, not just mutuals** — who to *befriend* (a connector) to unlock many at once.
3. **Serendipity layer** — Luma event angle + attendance-confidence model.
4. **Per-person tailored ranking** — the "For You feed" reorder behavior.

---

## Build status (backend complete, typechecks clean)

| Module | What | State |
|---|---|---|
| `convex/schema.ts` | 8 Warmline tables + `personVectors` (vector index) + `by_company` index | ✅ |
| `convex/ingest.ts` | upsert connections/leads/self/events/attendance | ✅ |
| `convex/resolve.ts` | merge dupes + Fiber X→LinkedIn bridge | ✅ |
| `convex/edges.ts` | backward-resolution (shared_company) + unlockValue | ✅ |
| `convex/openai.ts` | embed + LLM judge (fetch; keys set) | ✅ |
| `convex/rank.ts` | pipeline: embed → goal-fit×reachability → judge top N → recommendations | ✅ |
| `convex/icp.ts` | onboarding ICP store + embed | ✅ |
| `convex/feedback.ts` | thumbs vote (replace) | ✅ |
| `convex/feed.ts` | ranked feed (recs → heuristic fallback) + mutuals from edges | ✅ |
| `convex/crons.ts` | daily refresh (edges → rank) | ✅ |
| `convex/extension.ts` + `http.ts` | extension mutuals ingest endpoint | ✅ |
| `scripts/seed.mjs` | local loader (real export → Convex) | ✅ |
| tests (vitest + convex-test) | harness validated, 9 passing; full suite in progress | 🔵 |
| Chrome extension + React Flow graph | in progress (workflow) | 🔵 |

Keys on Convex deploy: `OPENAI_API_KEY`, `FIBER_API_KEY`, `FIRECRAWL_API_KEY`.
⚠️ Two ingest paths (mine vs teammate `linkedinImport.ts`) both write `persons` — pick one canonical.

---

## Data-reality line — almost entirely REAL data

Marvin has real personal exports. This collapses the "mocked" layer to near-zero. The line a judge will probe — and it's strong:

| Layer | Meaning | Source | Rows | Verdict |
|---|---|---|---|---|
| **Warm graph (1st-degree edges)** | who you actually know | `Connections.csv` | 3,942 | ✅ REAL (pre-loaded) |
| **Tie strength** | who you actually *talk to* (strongest warm signal) | `messages.csv` | 17,426 | ✅ REAL |
| **Pending ties** | open relationship loops | `Invitations.csv` | 413 | ✅ REAL |
| **Your profile** | for goal/interest embedding | `Positions/Education/Skills.csv` + Twitter archive | — | ✅ REAL |
| **Event attendees (serendipity)** | who attended which SF events (incl. X + LinkedIn handles) | `Config Leads - SF 2026.csv` | 1,364 | ✅ REAL |
| **Reach + enrichment** | 2nd/3rd degree, fresh roles, LinkedIn/X posts & activity | **Fiber API** | — | ✅ LIVE |
| **Live warm signal (optional)** | ongoing Gmail/contacts/calendar | Google OAuth | — | 🔵 OPTIONAL (stretch) |

📌 Stage line: *"This is my real network — 3,942 connections, 17k messages, the events I really attended. Fiber expands it live to 2nd/3rd degree."* Barely anything mocked.

### 🔴 SECURITY — real PII vs open-source requirement (BLOCKER)
Hackathon rules require the repo be **open-sourced on GitHub** for the event. The exports are real PII (private message *content*, emails, phones). **Never commit raw data.**
- `data/` → in both `.gitignore` and `.git/info/exclude`. Raw CSVs stay local.
- Ingest via a **local seed script** reading from `~/Library/.../Downloads`, pushing to Convex.
- Public repo ships **loader + schema only**, zero data. Demo runs off your live Convex deployment.

### Source files (local only — never committed)
- `~/…/Downloads/Complete_LinkedInDataExport_06-25-2026.zip.zip` → `Connections / messages / Invitations / Positions / Education / Skills / Email Addresses .csv`
- `~/…/Downloads/Config Leads - SF 2026.csv` → `Event, Guest, X profile, Linkedin, Date, Done?`
- `~/…/Downloads/twitter-2026-06-27-*.zip` → X archive (tweets, following, DMs)
- The hackathon Luma event ("AI Growth Hackathon by Orange Slice", YC SF, Jun 27–28) = live worked example for attendance-confidence.

### Fiber API — what we get (free hackathon credits: 5000 api + 25000 search)
Grounded in `https://api.fiber.ai/llms.txt`. Auth = `apiKey` in body (POST) / query (GET). MCP available at `https://mcp.fiber.ai/mcp/v2` (api-key) — prefer MCP over hand-rolled HTTP.

| Op | Use | Cost |
|---|---|---|
| `peopleSearch` / `textToProfileSearch` | find people (filter / NL) | 1 cr/result |
| `profileLiveEnrich` / `companyLiveEnrich` | fresh LinkedIn data, 2–4s, self-serve | 1 cr |
| `KitchenSinkProfile` | resolve person from any identifier → 44+ fields (experiences, tenures, education, connection/follower counts, open-to-work) | — |
| contact reveal (`syncQuickContactReveal`) | work/personal email + phone | 2–3 cr |
| **Tracker** (52 signal rules) | could power the proactive agent / "what changed" signals | free to preview |

What Fiber does **not** cover: your own Gmail/contacts/calendar (→ Google OAuth), and Luma (→ mock).

---

## Whiteboard sketch — what the team actually drew

The hand-drawn mock (`~/Desktop/warmline`) is the source of truth for UI. It shows a **List View**, not a graph:

- **Columns:** `Person` (name · company · role · LinkedIn badge) · `Score` (sortable) · `Thinking` · `Mutuals` (shared-connection avatar).
- **`Thinking` = the WHY column** — per-row multi-bullet reasoning, each bullet carrying its own **score dot** (green / yellow) = per-criterion confidence.
- **WHY column + HOW column** annotated together (how = channel + angle + opener, to be added beside thinking).
- **Actions:** `+ Ask your network` (request intro via a mutual) · `Find more` (expand search) · **good / bad** thumbs (the rerank feedback).
- **LISTS** — saved lists of people.
- **Left margin:** `1st query + weekly cron: what are your goals?` · `knowledge graph 3rd connection`.
- **Scrape sources (top note):** personal website, x, luma, linkedin, facebook, instagram, google — *broader than our realistic live line; treat fb/ig/personal-site as stretch/mock.*
- **Bottom:** a Convex **Runs dashboard** screenshot (cron `scheduled.timer` → `ingest` → `delete-old-events` → `finalization`) — confirms the proactive-cron architecture is the intended backbone.

### ⚠️ Hero-view conflict (must settle)
- **Brief text:** live animated **graph** is PRIMARY, list secondary.
- **Sketch:** **List view** is what's drawn; no graph sketched.
- Fork → see Open forks below.

---

## Resolved forks ✅

- **Graph edges** → REAL. `Connections.csv` = 1st-degree edges; Fiber expands to 2nd/3rd. `Mutuals` = a shared node on the warm path.
- **Luma / attendance data** → REAL. `Config Leads - SF 2026.csv` (1,364 attendees w/ X + LinkedIn) is the event dataset; no mock needed.
- **Warm-intro edge** → **observed, not inferred** (this is the ownable hard thing). Fiber exposes the engagement graph (`postReactionsLiveFetch`, `postCommentsLiveFetch`, `profileReactionsLiveFetch`, `profileCommentsLiveFetch`, `profileLatestActivitiesLiveFetch`) but NOT a raw mutual-connections list (`connection_count`/`follower_count` are numbers only).
  - **Edge derivation:** pull a Lead's post reactors/commenters → cross-reference against real `Connections.csv` (3,942) → a match = proven interaction ("Sarah liked 3 of their posts"). Entity resolution via `reverseEmailLookup` / `githubToLinkedin` to merge LinkedIn ↔ X ↔ leads.
  - **Strong (observed):** your Connection engages the Lead (or vice-versa).
  - **Fallback (inferred):** shared company / event (`Config Leads`) / school when no engagement found.
  - Edge carries a **confidence + proof string** surfaced in the `Why`.
- **Graph library** → **React Flow** (`@xyflow/react`). Custom nodes for people, animated edges to light the path node-by-node.
- **Hero view** → **list-primary**. Dashboard opens to the list of Leads / Connectors. Clicking a connector row expands an **inline accordion** below it rendering the React Flow knowledge graph of that warm path (You → Connector → Lead(s)), animated. Not a modal/popover.
- **Lead source** → **both**. `Config Leads SF 2026.csv` (1,364) pre-loads the feed so the dashboard opens populated; the **daily automatic** Fiber discovery run (`peopleSearch`/`textToProfileSearch` on the ICP) appends fresh leads. No manual "Find more". ICP vector ranks both.
- **The one ownable hard thing** → **backward warm-edge resolution** (see `docs/adr/0001`). We do NOT access the connection graph (no sanctioned API exposes it; scrapers are ToS-risky/fragile). Instead, for each *known* Lead we test which of your *known* connections bridges to them via shared-company (workhorse, free) → observed engagement (Fiber, proof) → shared-event → shared-school. No 2nd/3rd-degree traversal needed. Attendance-confidence demoted to secondary.

### Edge engine (the build)
```
Lead (Config Leads CSV / Fiber peopleSearch)
   │ company? (Position / Fiber profile)
   ▼
scan Connections.csv → which of MINE share company / event / school / engagement?
   ▼  rank by tie-strength (messages.csv) × goal-fit (embeddings)
   ▼  boost with Fiber engagement proof where it pays
Lead row + Warm path (You→Connection→Lead) + Why (proof string) + How (channel + opener)
```
Hero rows: hand-verify mutuals from your own logged-in LinkedIn UI, seed to Convex. Zero live call on stage.

### List UI layout (the feed) — locked, not yet built
Columns (per the sketch — Why and How are SEPARATE columns):
```
Person │ Score │ Why │ How │ Mutuals
  └ name·company·role·badge
          └ composite + per-criterion dots
                  └ 3 LLM-judge bullets + confidence dots  (whyBullets)
                        └ channel · angle · drafted opener  (how)
                              └ best connector(s) avatar
```
Schema already separates them (`whyBullets[]` vs `how{channel,angle,opener}`), so the component can't merge them. Row click → inline React Flow accordion.

### Graph accordion (React Flow) — content by row kind
- **Lead row** → `You → [top 1–3 connectors by intro_score] → Lead` (paths-in: "who gets me in").
- **Connector row** → `You → Connector → [leads they unlock]` (fan-out ≤12: "befriend them, unlock this room").
- Nodes = people (avatar, name, role badge), You pinned as root. Edges labeled with bridge **evidence** + confidence. Path animates **node-by-node** on expand; "+N more" never rendered past the ≤12 cap. Click node → that person's row.

### Two-mode core (the product)
1. **Connector to a Lead** — a *reachable* Lead (1st/2nd strong, 3rd flagged-weak) + the bridge to ask. Cold Leads excluded (cold = spam).
2. **Connector to befriend** ⭐ — a high-`unlock_value` person worth converting, **may be cold to you**, because one coffee opens a room ("befriend 1 → unlock 30"). Cold is *allowed here* — converting the connector is the strategy.

**Cold rule:** excluded for Leads, the whole point for Connectors.

**Reachability bridges** (LinkedIn *or* X): co-attended event (free, strong) · shared company · observed engagement (Fiber) · X follow/engagement (Twitter archive + Fiber). A Lead/edge qualifies only if ≥1 bridge is *detected*.

**Ranking:**
```
unlock_value(X)     = # of your goal-Leads X can reach (X-following + engagement; LinkedIn = mutuals via extension)
connector_score(X) = unlock_value(X) × reachability(You→X)
```
Best connector = high unlock + you already have a path. Still surfaced = high unlock + cold ("worth a cold coffee, here's the room").

**Picking the best connector among many mutuals (a Lead can have 68):**
```
intro_score(connector, Lead) = your_tie_to(connector) × connector_knows(Lead)
  your_tie_to        = tieStrength from messages.csv (+ recency)
  connector_knows    = REAL-relationship signals between connector & Lead, not coincidence:
                       overlapping tenure (same company, overlapping dates) ·
                       same school + overlapping years · mutual engagement · co-attended event
```
- The discriminator is **time/co-presence overlap** ("at Stripe *together* 2021–23"), not just "both list Stripe" — that's how you find the ~5 real friends hiding in 68 connections.
- **Cost guard (2-stage):** (1) prefilter the mutuals by `your_tie` (free, from messages) → top ~10 you'd actually ask; (2) enrich only those ~10 + the Lead via Fiber `KitchenSinkProfile` (experiences/education/dates) → compute overlap. Never enrich all 68. Surface top 3, "+N more".
- A mutual you don't talk to ≠ a usable intro (your_tie ≈ 0 kills the score). If *all* mutuals are dormant to you → Lead has no strong path → sink it, or flip to "befriend one of these mutuals first" (graph-flattening).
- Honesty: overlapping tenure/school *implies* a relationship, surfaced as a confidence-scored Why ("colleagues at Stripe 2021–23"), not asserted as fact.

### THESIS: flatten the social graph (from the team transcript)
Warmline's purpose = **turn 2nd-degree into 1st-degree over time**. Two connector candidate pools:
1. **Dormant connections** — connected on LinkedIn but not friends (low tie-strength). The big latent pool → **activate**.
2. **Met-not-connected** — crossed paths, no connection → **connect**.

### The growth loop (the engine)
```
your N connections → extract ICP Leads → pool runs low →
recommend ~30 people to CONNECT with ("same school/experience/events/audience + unlocks more ICP") →
you connect → N+30 → rerun → more Leads → compounds
```
Each new 1st-degree connection deepens reachability — the graph flattens as you use it.

**"Who to connect with" (the outward step — finding people NOT in your network):**
```
1. take your GOOD leads (thumbs-up / high score) → extract commonality (role, company-type, school, events, topics)
2. Fiber peopleSearch / textToProfileSearch on those filters → candidates NOT in your connections
3. rank: ICP-fit (embedding) × likely-to-accept (shared school/company/events/mutuals) × unlock potential (their X-following/engagement overlaps your lead pool)
4. surface "Connect with X — same YC batch + GTM at Series A, opens ~8 leads"
```
On accept they become 1st-degree → graph flattens. Fiber-heavy → pre-compute a small set for the demo, not live. "Likely-to-accept" is a heuristic, framed as a suggestion.

### Entity resolution (`convex/resolve.ts`)
The same person appears across Connections (slug), Config Leads (slug+handle), X archive (handle), Fiber. Merge rule, strict → loose:
1. exact **linkedin slug** (canonical key) · 2. exact **x handle** · 3. exact **email**
4. X-only row → Fiber `twitterHandleToLinkedinUrl` → slug → rule 1
5. name + **same company** fuzzy → LAST resort only (name-only merge corrupts the graph — skipped).
`mergePersons` moves all refs (edges/attendance/recs) drop→keep + fills fields; `resolveXHandles` runs the Fiber bridge (hero set for demo, not all 1,364 — credits).

### Onboarding → ICP (3 links)
Paste 3 links; no manual goal-typing required:
- **Product website** ⭐ → Firecrawl scrape → LLM derives who you sell to → **ICP vector** (the source of truth for goal-fit). Optional goal box narrows it.
- **Your LinkedIn** → identity + connection graph (the export) → **warm-reachability**.
- **Your X** → voice/interests + X following → reach + opener tone.
⚠️ Product-site scrape is a live call → pre-scrape + cache for the demo.

### Ranking pipeline (Score + Why + How)
```
embeddings  → sort the pool (1,000s) → top ~30          [cheap, OpenAI embeddings]
LLM-judge   → on the ~30 only: dot-score + 3 WHY bullets (fit vs ICP)
                                        + 3 HOW bullets (reach: shared interests,
                                          things they like, location, next event)
Score(person) = goal_fit × warm_reachability
```
- WHY/HOW bullets grounded in real scraped activity (Fiber posts/X + Luma events + location) — never invented. Each bullet carries a confidence dot (the sketch's `Thinking` column).
- LLM-judge + Fiber activity pulls run on the shortlist only, **pre-computed for the demo** so the feed opens instantly.
- Honesty: ranking is real; we don't claim it "learns overnight" — the ICP vector just tunes live to thumbs.

### Feedback loop (refines ICP)
Thumbs good/bad on Leads → nudge **ICP** vector → next run finds people like the *good* ones, and surfaces **side-door** connectors to them (high-value Leads won't answer cold).

### Data / observability decisions (from transcript)
- **Mutual LinkedIn connections** → a **Manifest V3 Chrome extension, loaded unpacked (dev mode)**. Content script on `linkedin.com/in/*` reads the "mutual connections" box → POSTs to a Convex HTTP action → stores connector edges. Run it on a **Lead's** profile; the mutuals returned ARE your connectors to that Lead (LinkedIn only shows mutuals relative to you). Pace ≤~80 profiles/day; **pre-cache before the demo, never live on stage** (see ADR 0002).
- **People you're NOT connected to** → can't see their connections → match on **experience / school / events commonality** + X mutual-follow + engagement.
- **X = mutual follow** (both directions, observable via Fiber). **LinkedIn = mutual connections** (extension) + engagement (Fiber). Events = "go meet them" channel (attendance-confidence), NOT a who-knows-whom proxy.
- **Mock strategy for the demo:** 2nd-degree mocked using **Zach's real LinkedIn connection export** — Zach = the demo connector; you're connected to Zach; assume his connection set is the unlock pool.

### Convex schema (build contract)
```
persons        name, headline, company, linkedin_url, x_handle, avatar, is_self,
               role(lead | connector),                  ← only two roles
               unlock_value,                             ← # leads this connector unlocks (ranking)
               relationship_to_you(connected | not_connected),  ← in/out of network
               mutuals_status(pending | done | failed)
edges          from, to,
               type(linkedin_mutual | x_mutual_follow | engagement |
                    shared_company | shared_school),       ← NOT co_attended_event
               confidence(0–1), evidence
events         name, date, attendee_ids[]                 ← "go meet them" channel, not a relationship
recommendations  person_id, icp_id, kind(lead|connector), score,
               why_bullets[], how{channel,angle,opener},
               unlocks_ids[], why_now?(trigger)            ← feed rows, recomputable
icp            text, vector, source{website,linkedin,x}
feedback       person_id, vote(up|down), at               ← nudges icp vector
users          the account
```
Decisions: roles collapse to `{lead, connector}` — one role, single canonical name (no "warm intro" / "gatekeeper"). High-`unlock_value` connectors just rank higher; no separate badge. A connector is **in network (connected → ask directly)** or **out of network (not_connected → befriend first)**. `recommendations` kept separate from `persons`/`edges` so ranking/why/how recomputes without touching the graph.

### Extension resilience & resume
- **Push, not poll:** extension POSTs edges → Convex HTTP action → reactive feed updates live. No "waiter" job.
- **Durable queue:** persist each read mutual to `chrome.storage.local` *before* sending; flush on reconnect. Browser close / wifi drop = pause, not loss.
- **Idempotent edges:** stable key (`from+to+type`) → Convex upsert → retries never duplicate.
- **Resume = a query:** per-Lead `mutuals_status (pending|done|failed)` lives in Convex (source of truth). On reopen, ask "which Leads pending/failed?" → continue; done Leads skipped (saves profile-view budget).
- **Never blocks the feed:** backward-resolution gives a working feed immediately; mutuals enrich async.
- Demo: all pre-cached → resilience not exercised on stage.

### Deferred (good, not v1)
The deep chain — "which 2nd-degree to convert so it unlocks specific 3rd-degree" — agreed valuable but out of scope: the near layer already has plenty, and it auto-deepens as the graph flattens.

### Proactive agent (primary wedge) — daily Convex cron
Runs every day on its own; produces a **daily report** of people to reach out to (no query, no button). Regenerates the feed against your **ICP**. Pulls candidates from 5 triggers, most being *changes since last week* (change detection = why it's proactive, not Happenstance):
1. **Goal match** — Fiber `peopleSearch`/`textToProfileSearch` on the Goal.
2. **Job changes** ⭐ — Fiber `job-changes` list on your connections → *Tom just joined Stripe* = a path that didn't exist last week.
3. **New engagement** — Fiber `profileReactions`/`postComments` → a connection started engaging a target = fresh bridge.
4. **Upcoming events** — `Config Leads`/Luma → people at an event you're about to attend (time-sensitive serendipity).
5. **Dormant strong ties** — `messages.csv` → high-value people gone quiet → reconnect nudge.

Each candidate → backward-resolve bridge → score (goal-fit × tie-strength × freshness) → write top N to feed. You open Monday, it's already there.
Cadence **daily, automatic**. **Delivery: in-app only** (dashboard opens to today's report); email/Slack digest = productionization story, not built.

**Demo = open the dashboard → a real, ranked list of leads** (your real connections + real Config Leads, scored by ICP × reachability). Data is seeded + ranked ahead of time so it loads instantly and can't hang on stage — the list itself is fully real, nothing faked, no special cards.

## Small forks — locked
- **Cron cadence** → **daily, automatic** (no manual trigger). The product is a **daily report** of people to reach out to, refreshed every day on its own. No "Find more" / "run now" button.
- **"How" opener** → LLM drafts from their real recent activity; draft-only, editable, never auto-sent.
- **UI scope** → Find more ❌ (cut — daily auto report replaces it) · Lists ✅ · Ask-your-network ❌ (cut for v1).
- **Score dots** → 3 dots = goal-fit / warmth / recency.
- **Schema** → `tie_strength` stored on persons + `attendance` join table (person×event confidence). Confirmed.

## Open forks (grill queue — answer in order)

- **OPEN — Score column semantics.** Sketch shows per-bullet colored dots inside `Thinking`. Is `Score` (a) goal-fit rank, (b) warm-path strength (driven by `messages.csv` tie count), or (c) per-criterion confidence dots averaged? Pick the canonical meaning. *(My pick: composite = goal-fit × warm-strength, dots show per-criterion.)*
- **OPEN — `Ask your network` + `Find more` + `Lists`.** In v1 demo scope or cut? Each is a feature, not free.
- **OPEN — reranking: real embeddings or faked reorder?** Demo gold = thumbs-down → list visibly re-sorts. *(My pick: real OpenAI embeddings, goal vector nudged on thumbs — it's cheap and claimable.)*
- **OPEN — Gmail/Google OAuth in scope?** Stretch only — the LinkedIn export already covers warm signal. *(My pick: cut for v1, it's OAuth-verification risk we don't need.)*
- **OPEN — connector math.** "Befriend 1 person → unlock 30 intros" — compute from shared-event (`Config Leads`) + shared-company (`Connections`/Fiber) fan-out. How exactly?

- **OPEN — Gmail in scope?** Contacts + Calendar only, or also Gmail read-only for warm signal? (Gmail = richer warm signal but heaviest OAuth scope.)
- **OPEN — the graph edges (load-bearing).** Fiber gives *people* + *company co-membership*, but likely **no explicit person→person connection edges**. So is "2nd/3rd degree / knowledge graph" a **real** social graph or an **inferred** one (shared company / shared event / shared school as the edge)? This decides what the hero graph actually shows.
- **OPEN — the one ownable hard thing.** Brief's candidate = **attendance-confidence model** (fuse mock-Luma RSVP + Fiber live social posts + LLM-as-judge → "will they actually be there" score). Alternatives: warm-path finding, entity resolution. Pick ONE to build for real.
- **OPEN — reranking: real embeddings or faked reorder?** Either is fine — we just need to know what we can claim. Demo gold = thumbs-down a row → list visibly re-sorts.
- **OPEN — graph lib + node cap.** Needs animated edges (light a path node-by-node). Candidates TBD. Cap node count so it stays snappy.
- **OPEN — connector math.** "Befriend 1 person → unlock 30 intros" — how computed from the data we have?

---

## Honesty guardrails (protect the technical score — do NOT claim)

- ❌ Don't say the model "trains overnight" / "gets smarter every day." Only claim what reorders **live** in the demo. Frame the rest as *transparent, user-tunable ranking.*
- ❌ Don't claim a burner Luma account signs up to events live. Data is mock; burner is the *productionization path*, not a feature.
- ❌ Don't auto-send outreach. **Draft only.**
- ❌ Avoid surveillance framing ("stalking"). Reframe as serendipity + leverage.
- ✅ Be upfront on stage about which data is real vs mocked.

---

## Scope

**IN:** Google warm-signal connect · Fiber reach/enrichment · proactive agent (Convex cron) · live animated graph as PRIMARY view · why + how column w/ drafted opener · embedding rerank w/ visible reorder · attendance-confidence on mock Luma + Fiber social · CSV export.

**OUT (deliberately cut):** overnight learning model · CRM auto-push / OAuth-to-CRM (→ CSV) · auto-send · live burner Luma · iMessage/WhatsApp.

---

## Stack

- **Convex** — backend + realtime + cron/scheduled fns (sponsor + judge Wayne; use prominently).
- **OpenAI** — LLM + embeddings (credits provided).
- **Fiber** — people/profile/company data + signals.
- **Next.js 16 / React 19** — frontend (starter already wired).
- **Convex Auth** — already scaffolded.

---

## Hero demo flow (the one thing — rehearse until clean)

> Goal in → agent already ran → surfaces a warm path you **didn't ask for** → graph **animates the path live** (you → connector → target) → "how" shows channel + opener → drafted opener appears.

Scripted: *"It's Monday. Your agent already ran. You want a connector at Stripe — watch the graph find the path through Sarah (your YC batchmate) to her former Stripe colleague. Here's the opener that lands."*

**Demo safety:** run locally / pre-cache so wifi can't kill it · record a backup video · cap graph nodes · judging window ~1–3 min, every second is the hero flow.

---

## Glossary (draft — to be hardened into CONTEXT.md as terms lock)

Many overlapping words in the brief; we must pick canonical ones:
- **You / Seed** — the user, graph root.
- **Connector** — the bridge person (one canonical word; high-unlock ones rank higher, no separate "gatekeeper" name).
- **Target** — the person you ultimately want to reach.
- **Warm path** — You → Connector → Target chain.
- **Lead** — a ranked row in the For You feed (a Target + its warm path + why + how).
- **Goal** — the stated objective the feed ranks against.
- ⚠️ Avoid "mutual" (1st-degree only — that's the Happenstance trap we're beating).

---

## Next session: resume grilling at the OPEN forks, top to bottom.
