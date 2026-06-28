# Warmline

The "For You feed for your warm network." Surfaces the connectors and high-value people you should reach out to against a stated goal — proactively, each with the reasoning (why) and the approach (how).

## Language

**You**:
The user — the root of the warm network. Graph origin.
_Avoid_: ego, root node, me

**Connection**:
A person you already know directly (1st degree), sourced from your real LinkedIn connections.
_Avoid_: friend, contact (overloaded), mutual

**Tie strength**:
How warm a **Connection** actually is, derived from real interaction history (messages, invitations) — not mere presence in your network.
_Avoid_: closeness, score (reserved for ranking)

**Lead**:
A person **You** ultimately want to reach — the valuable end target. Must be *reachable* (have at least one **Warm path**); a goal-matching person with no path is cold and is not a Lead.
_Avoid_: target, prospect, end user

**Connector**:
A person who can introduce **You** to one or more **Leads** — the bridge. The single canonical term for that role (no "warm intro" / "gatekeeper"). A Connector is either **in your network** (ask directly) or **not** (befriend first). A high-**Unlock value** Connector — one who opens a whole room — is worth converting even when cold ("befriend 1 → unlock 30"), but it is the same role, not a separate name.
_Avoid_: warm intro, gatekeeper, intro (the act), referrer

**Unlock value**:
The size and quality of the **Lead** set a **Connector** can reach. Drives whether a cold Connector is worth converting.
_Avoid_: reach score, leverage

**Intro score**:
How good a specific **Connector** is for a specific **Lead** = your **Tie strength** to the Connector × how well the Connector actually knows the Lead (overlapping tenure / school years / engagement). Picks the best 1–3 from many mutuals.
_Avoid_: match, relevance

**Dormant connection**:
A 1st-degree **Connection** you have little or no real relationship with — barely or never messaged (low/zero **Tie strength**), connected on paper only. This is *most* of your connections, and the largest pool of latent **Connectors** — links you already have but never used. "Activating" them is a core job.
_Avoid_: weak tie, inactive contact, gone-cold

**ICP**:
The profile of the people **You** want (derived from your **Goal** + product), against which **Leads** are ranked and which the good/bad feedback refines.
_Avoid_: persona, segment

**Commonality**:
Shared **experience / company / school / event** used to judge fit (and candidate connections) for people whose connection list **You** cannot see.
_Avoid_: similarity, overlap

**Graph flattening**:
The product's purpose — converting 2nd-degree people into 1st-degree **Connections** over time so the reachable pool keeps growing.
_Avoid_: network growth (too generic)

**Warm path**:
The chain **You → Connector(s) → Lead** that makes the introduction possible.
_Avoid_: route, degree chain

**Mutual**:
The shared **Connection** displayed for a **Lead** — the visible proof of the **Warm path**, i.e. the **Connector** you'd actually ask. (Column in the list view.)
_Avoid_: using "mutual" to mean any 1st-degree **Connection**

**Goal**:
The stated objective the feed ranks **Leads** against (e.g. "intro at Stripe"). Captured on first query and re-asked on a weekly cron.
_Avoid_: query, intent

**Why**:
Why to reach out — 3 bullets from the LLM judge (fit against your **ICP**), each with a confidence dot, grounded in the person's real activity.
_Avoid_: explanation, thinking (UI label only)

**How**:
How to land it — 3 bullets grounded in real signals (shared interests, things they like, location, next **Event**) plus channel + angle + a drafted opener. Draft only — never auto-sent.
_Avoid_: action, outreach

**Score**:
A row's rank against the **Goal** = goal-fit × warm-reachability. Embeddings sort the pool; the LLM judge scores the shortlist.
_Avoid_: rating, match

**Attendance-confidence**:
A score for whether a person will actually be at a given **Event**, fused from RSVP/attendee data + live social signal + LLM judgment.
_Avoid_: RSVP score, presence

**Event**:
A real-world gathering people attend — a "go meet them" channel where a **Lead** or **Connector** will be present. Not a who-knows-whom proxy.
_Avoid_: meetup, occasion

## Relationships

- **You** have many **Connections** (1st degree); each has a **Tie strength**.
- A **Warm path** links **You** → one or more **Connectors** → a **Lead**.
- A **Connector** with high **Unlock value** sits on the **Warm path** to many **Leads** — worth converting even when cold.
- The product's purpose is **Graph flattening**: turn 2nd-degree people into 1st-degree **Connections** over time. The largest fuel is **Dormant connections** — connected, not friends — which the agent activates.
- The product surfaces two modes: (1) reach a **Lead** via an existing **Connector**; (2) befriend a high-**Unlock value** **Connector** (possibly cold) because they open a whole room of **Leads**.
- The feed mixes **Leads** (the end people you want) and **Connectors** (who bridge or unlock them), ranked against the **Goal**, each with a **Why** and a **How**.
- A **Mutual** is the **Connection** shown as proof of a **Lead**'s **Warm path** — i.e. the **Connector** to ask. When a Lead has many mutuals, **Intro score** picks the best few.
- **Attendance-confidence** scores a person against an **Event**, feeding the serendipity layer of ranking.

## Example dialogue

> **Dev:** "A row in the feed — is it always someone I want to reach?"
> **Domain expert:** "Two kinds. A **Lead** is the end person you actually want. A **Connector** is someone who can put you in front of Leads — that row is the *path*, not the destination. Expand it and you see who they unlock."
> **Dev:** "A Lead has 68 mutual connections — which do I ask?"
> **Domain expert:** "**Intro score** — your tie strength to each mutual times how well they actually know the Lead (overlapping tenure, school, engagement). Surface the top three, not 68."

## Flagged ambiguities

- "end users" / "leads" vs "connectors" — resolved: **Leads** are the end people you want; **Connectors** introduce you to them. The feed lists both, badged.
- "connector" vs "connection" — resolved: a **Connection** is anyone you know 1st degree; a **Connector** is someone (in or out of network) acting as a bridge to a **Lead**.
- "warm intro" / "gatekeeper" — dropped. The single role is **Connector**; high-leverage ones are just Connectors with high **Unlock value**.
- "mutual" was used to mean both *any 1st-degree connection* and *the shared bridge on a path* — resolved: **Mutual** = the **Connector** shown as proof of a **Warm path**; a plain 1st-degree person is a **Connection**.
- "score" vs "tie strength" — resolved: **Tie strength** = warmth of a relationship; **Score** = a row's rank against the **Goal**.
