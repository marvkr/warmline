# Warmline demo-data — Self-Review (Step 4 gate)

Independent review before the final local commit. Four independent subagents reviewed `seed/` (none
of them wrote the data): **data/provenance**, **PII + git-safety**, an adversarial **red-team**, and a
**final gate-keeper** that re-checked after fixes (with a mutation test proving the validator bites).

`node seed/validate.mjs` → **37/37 PASS, exit 0** (re-run after fixes).

## Checklist verdict (PHASE_1 Step 4)

| # | Item | Verdict |
|---|---|---|
| 1 | Schema matches `convex/` — or `SCHEMA.md` complete if no schema yet | **PASS** — `convex/schema.ts` has no domain tables, so `SCHEMA.md` is the contract; all 5 entities + Flags + the confidence method are fully documented. |
| 2 | Hero path renders: is_self → Han → ≥12 named, recognizable fan-out, all linked | **PASS** — `self`(Zach) →`han` (linkedin_1st) → exactly **12** `is_target` fan-out via `co_attended_event`; all 12 are real, recognizable, and listed Mintlify Gala attendees. |
| 3 | Confidence tiers sensible (Mintlify circle High; broader Gala Medium), not uniform/random | **PASS** — 5 distinct values (High 0.92/0.76; Medium 0.55/0.51/0.48); deterministic formula independently re-derived for every co-attendance edge incl. tier threshold. Not randomized. |
| 4 | Hero opener specific + grounded in Han's real activity | **PASS** — references Mintlify + the real Gala and asks for two specific intros (Jeff/Chroma, Albert/Cartesia). Softened to not assert Han *organized* the Gala. Flagged `how_generated:true`. |
| 5 | Go-cold rec present and plausible | **PASS** — Cristina Cordova (COO, Linear), real connection since 2021-02-21 = dormant 5+ yrs; has a why-now `trigger` (flagged illustrative) + re-intro opener. |
| 6 | Judge edges present but behind a toggle (excludable) | **PASS** — `flags.include_judge_edges` toggle; judge people (`role:judge`) + `judge_kicker:true` edges (Han→Danylo, Purav→Wayne). Validator simulates toggle-OFF and confirms the 12-wide hero path stays intact. |
| 7 | ZERO PII; raw `_inputs/` gitignored and unstaged | **PASS** — independent regex scan of all committed `seed/` files: no emails/phones/DM/login data. `seed/_inputs/` is gitignored, `git ls-files seed/_inputs` empty. (Note: the source Gabriel row carried a real personal email — correctly dropped from the output.) |
| 8 | Only `seed/` (+ `.gitignore`) changed; `main` untouched; no force-push | **PASS** — branch is 3 commits ahead of `main` (`4c86ab3`): `.gitignore` line, the pre-approved `package-lock.json` sync, and `seed/`. `main` not committed to; `reflog` shows a clean linear history, no rebase/reset/force. |

**OVERALL: PASS** — all 8 items pass; ready for the final local commit.

## Red-team's BLOCK — adjudicated and refuted (kept for the record)
The red-team flagged Justin Torre's employer as fabricated ("he's Helicone, not Mintlify") — the single
highest-scored on-camera node. **Verified on the web: Mintlify acquired Helicone**, so Justin (Helicone
co-founder/CEO) is now genuinely at Mintlify — matching Zach's real LinkedIn export
(`Connections.csv`: "Mintlify, Head of Enterprise Solutions"). The data is **correct and current**; the
red-team used pre-acquisition training knowledge. `mintlify:true` and the 0.92 "Mintlify circle"
rationale are legitimately earned (Han + Justin are now colleagues). Left intentionally unchanged.
Lesson: the real scraped export beat the model's memory — exactly as the build's provenance rule intends.

## Red-team's valid should-fixes — applied
- **Validator now enforces the Claims Ledger:** `confidence_generated` true on co-attendance / false on
  linkedin_1st; `how_generated` true on every rec; `trigger_generated` true on the go-cold trigger.
- **Determinism check hardened:** re-derives every co-attendance score *and tier* from an independent
  feature map; an unknown target is a hard FAIL (no silent skips).
- **Go-cold card scrubbed:** removed builder TODO text ("replace before filming", "(model-generated
  placeholder)") from on-camera fields; honesty preserved structurally via `trigger_generated:true` +
  `_meta.claims`. New validator check fails on any TODO/placeholder text in rendered rec copy.
- Mutation test (final gate-keeper): 5 deliberate corruptions each tripped the expected check.

## Non-blocking, disclosed to the morning (see SUMMARY.md)
- Justin Torre title nuance (export "Head of Enterprise Solutions" vs some aggregators "Engineering
  Manager") — kept the self-reported LinkedIn value; Helicone→Mintlify is a *strength* on camera.
- Beat 4 spoken signals ("social-post signal + LLM-as-judge") vs the implemented deterministic 4-term
  score — align the script line or frame the richer signals as the productionization path.
- Go-cold `trigger` is illustrative (flagged) — optionally swap a real public signal before filming.
