# Warmline — Build Plan (grill session output)

> **Status:** living doc from the planning/grill session. Decisions marked **PROPOSED** are my recommendations awaiting team sign-off; **OPEN** = unresolved fork we still need to answer. Nothing here is built yet — repo is a fresh Convex + Next.js + Convex Auth starter (empty schema except an auth + `numbers` placeholder).

**Product:** "For You feed for your warm network." Proactive agent that surfaces the warm intros / high-value people you should reach out to against a stated goal, each with a **why** + **how** (channel + angle + drafted opener). Hero visual = live animated network graph (you → connector → target).

**Event:** YC AI Growth Hackathon, 24h build. Judged on **Cool** (motion), **Useful** (a growth person acts on it), **Technical** (one ownable hard thing).

---

## The wedges (do NOT drift into a Happenstance clone)

1. **Proactive, not reactive** — pushes the intro you didn't ask for. *Primary wedge, lead with it.*
2. **2nd/3rd degree, not just mutuals** — who to *befriend* (a gatekeeper) to unlock many at once.
3. **Serendipity layer** — Luma event angle + attendance-confidence model.
4. **Per-person tailored ranking** — the "For You feed" reorder behavior.

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
- **Hero view** → **list-primary**. Dashboard opens to the list of Leads / Warm intros. Clicking a warm-intro row expands an **inline accordion** below it rendering the React Flow knowledge graph of that warm path (You → Warm intro → Lead(s)), animated. Not a modal/popover.
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

## Open forks (grill queue — answer in order)

- **OPEN — Score column semantics.** Sketch shows per-bullet colored dots inside `Thinking`. Is `Score` (a) goal-fit rank, (b) warm-path strength (driven by `messages.csv` tie count), or (c) per-criterion confidence dots averaged? Pick the canonical meaning. *(My pick: composite = goal-fit × warm-strength, dots show per-criterion.)*
- **OPEN — `Ask your network` + `Find more` + `Lists`.** In v1 demo scope or cut? Each is a feature, not free.
- **OPEN — reranking: real embeddings or faked reorder?** Demo gold = thumbs-down → list visibly re-sorts. *(My pick: real OpenAI embeddings, goal vector nudged on thumbs — it's cheap and claimable.)*
- **OPEN — Gmail/Google OAuth in scope?** Stretch only — the LinkedIn export already covers warm signal. *(My pick: cut for v1, it's OAuth-verification risk we don't need.)*
- **OPEN — gatekeeper math.** "Befriend 1 person → unlock 30 intros" — compute from shared-event (`Config Leads`) + shared-company (`Connections`/Fiber) fan-out. How exactly?

- **OPEN — Gmail in scope?** Contacts + Calendar only, or also Gmail read-only for warm signal? (Gmail = richer warm signal but heaviest OAuth scope.)
- **OPEN — the graph edges (load-bearing).** Fiber gives *people* + *company co-membership*, but likely **no explicit person→person connection edges**. So is "2nd/3rd degree / knowledge graph" a **real** social graph or an **inferred** one (shared company / shared event / shared school as the edge)? This decides what the hero graph actually shows.
- **OPEN — the one ownable hard thing.** Brief's candidate = **attendance-confidence model** (fuse mock-Luma RSVP + Fiber live social posts + LLM-as-judge → "will they actually be there" score). Alternatives: warm-path finding, entity resolution. Pick ONE to build for real.
- **OPEN — reranking: real embeddings or faked reorder?** Either is fine — we just need to know what we can claim. Demo gold = thumbs-down a row → list visibly re-sorts.
- **OPEN — graph lib + node cap.** Needs animated edges (light a path node-by-node). Candidates TBD. Cap node count so it stays snappy.
- **OPEN — gatekeeper math.** "Befriend 1 person → unlock 30 intros" — how computed from the data we have?

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

> Goal in → agent already ran → surfaces a warm path you **didn't ask for** → graph **animates the path live** (you → gatekeeper → target) → "how" shows channel + opener → drafted opener appears.

Scripted: *"It's Monday. Your agent already ran. You want a warm intro at Stripe — watch the graph find the path through Sarah (your YC batchmate) to her former Stripe colleague. Here's the opener that lands."*

**Demo safety:** run locally / pre-cache so wifi can't kill it · record a backup video · cap graph nodes · judging window ~1–3 min, every second is the hero flow.

---

## Glossary (draft — to be hardened into CONTEXT.md as terms lock)

Many overlapping words in the brief; we must pick canonical ones:
- **You / Seed** — the user, graph root.
- **Connector / Gatekeeper** — the 1 person who unlocks many targets (pick ONE word).
- **Target** — the person you ultimately want to reach.
- **Warm path** — You → Connector → Target chain.
- **Lead** — a ranked row in the For You feed (a Target + its warm path + why + how).
- **Goal** — the stated objective the feed ranks against.
- ⚠️ Avoid "mutual" (1st-degree only — that's the Happenstance trap we're beating).

---

## Next session: resume grilling at the OPEN forks, top to bottom.
