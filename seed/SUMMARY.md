# Warmline demo-data — Build Summary (for the morning)

**Status: built, validated, self-reviewed PASS, and committed locally to `zach/demo-data`.**
**NOT pushed** — per your instruction, the push is yours to do after you review. (See "To push" below.)

## What was built
A PII-free demo dataset under `seed/`, generated from your real exports, wired to the storyboard:

- **`demo-data.json`** — the dataset: 23 people, 24 edges, 2 events, 2 recommendations, 1 goal.
  - Hero path: **You → Han Wang (Mintlify co-founder, your real 1st-degree connection) → 12 fan-out
    targets** who really attended the **Mintlify Gala (2026-04-16)**: Justin Torre, Gabriel Petersson,
    Dylan Patel, Jeff Huber, Albert Gu, Ben Tossell, Aiden Bai, James Grugett, Cameron Pfiffer,
    Aron Korenblit, Jessy Lin, Evan Bacon.
  - **Gatekeeper rec** (Han unlocks all 12, with a Mintlify/Gala-grounded opener + two specific intro
    asks) and a **go-cold rec** (Cristina Cordova, Linear COO — a real connection dormant 5+ years).
  - **Judge kicker** behind `flags.include_judge_edges`: You→Purav→**Wayne Sutton** (Convex) and
    You→Han→**Danylo Borodchuk** — togglable off without breaking the hero path.
- **`generate.mjs`** — regenerates the data; the confidence rule lives here as auditable code.
- **`validate.mjs`** — 37-check gate (hero path, non-uniform/deterministic confidence, judge toggle,
  Claims-Ledger flags, provenance, ZERO PII). Run: `node seed/validate.mjs`.
- **`load.mjs`** — dry-run Convex insert-planner + the exact mutation to wire when the backend exists.
- **`SCHEMA.md`** — the backend contract. **`REVIEW.md`** — the self-review. **`WORKLOG.md`** — build log.

## Schema decision
`convex/schema.ts` has **no domain tables yet** (only `authTables` + a stub `numbers` table). So per
PHASE_1 Step 1 this took the **"no schema yet"** path: the data is emitted as plain JSON and `SCHEMA.md`
documents every entity/field as the contract for you (Marvin) to build the Convex backend to. When the
backend exists, `load.mjs` shows exactly how to push the data in.

## Confidence model (the technical headline — Beat 4)
Explainable, deterministic, **never randomized** (verified by independent re-derivation):
`c = 0.45 (Gala co-attendance) + 0.28·direct-connection + 0.25·same-employer-as-Han + relevance`,
capped 0.92, tier = High if ≥ 0.70. Yields High = Justin 0.92 (Mintlify colleague + your connection),
Gabriel 0.76 (your connection); Medium = the broader Gala crowd at 0.55 / 0.51 / 0.48 by goal-relevance.
Specific values + openers are flagged model-generated (`confidence_generated` / `how_generated` /
`trigger_generated`) so nothing illustrative is sold as ground truth. **Per-face display shows the
tier (High/Medium), not the decimal** — see Frontend wiring notes below.

## What's verified
- ✅ Every hero/judge/go-cold person traces to a real LinkedIn connection or Luma guest-list row
  (line-level provenance in `WORKLOG.md`); no invented people.
- ✅ ZERO PII in committed output; `seed/_inputs/` gitignored + unstaged; the one personal email in the
  source (Gabriel's row) was dropped.
- ✅ Only `seed/` + the `.gitignore` line + the pre-approved lockfile commit changed; `main` untouched;
  no history rewriting.
- ✅ `validate.mjs` 37/37 green; 4 independent review agents → overall PASS (a mutation test confirmed
  the validator's checks actually fail on corrupted data).

## For the morning — prioritized (3 small calls, none blocking)
1. **Justin Torre framing (nice-to-know, not a bug).** Your export lists him "Head of Enterprise
   Solutions @ Mintlify" — correct: **Mintlify acquired Helicone** (his company), so if a judge says
   "isn't that the Helicone guy?" the honest answer ("yes — Mintlify acquired Helicone") is a *strength*.
   Some web aggregators say "Engineering Manager"; I kept your self-reported LinkedIn title. Change only
   if you prefer a different label.
2. **Beat 4 script vs. implemented score.** The storyboard's spoken line names "social-post signal +
   LLM-as-judge"; the seed score is the deterministic 4-term rule above (no LLM-judge in static data).
   Either align the spoken line to what's computed, or frame the richer signals as "here's how this
   productionizes." Your call before filming.
3. **Go-cold trigger is illustrative** (flagged `trigger_generated:true`). Optional: drop in a real
   recent Cristina/Linear public signal for Beat 5 before recording.

## Frontend wiring notes (for Marvin)
- **Per-face confidence badge: read `flags.show_confidence_as`, don't hardcode.** It's set to
  `"tier"` — render each fan-out face with its `confidence_tier` (`High` / `Medium`) badge, NOT the
  raw `confidence` decimal. (Several Medium faces share the same decimal by design; showing the number
  per-face would read as templated and undercut the Beat-4 "real model" claim.) Keep using the numeric
  `confidence` internally for **ranking + the Beat-4 live reorder** — it just shouldn't be shown on
  each face. If we ever want raw scores back, flip the flag to `"score"`; the renderer should branch
  on it, not assume.
- **Fan-out reveal order = array order in `recommendations[gatekeeper].unlocks_ids`** (and the Han→
  edge order): Han-only cold names lead (Dylan, Jeff, Albert …), your two direct connections
  (Justin, Gabriel) land last as the "already one step in" kicker. Preserve this order on screen.
- **Judge kicker: read `flags.include_judge_edges`.** When `false`, drop `role:"judge"` people and
  `judge_kicker:true` edges; the 12-wide hero path stays intact (validated).

## To push (when you're ready)
```
git -C C:\Users\speck\warmline push -u origin zach/demo-data
```
The branch is committed locally and ready; I did not push it.
