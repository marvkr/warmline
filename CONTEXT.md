# Warmline

The "For You feed for your warm network." Surfaces the warm intros and high-value people you should reach out to against a stated goal — proactively, each with the reasoning (why) and the approach (how).

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
A person **You** ultimately want to reach — the valuable end target. May be reachable directly or via a **Warm intro**.
_Avoid_: target, prospect, end user

**Warm intro**:
A person in your network who can introduce **You** to one or more **Leads** — the bridge. The thing Warmline surfaces that nobody else does.
_Avoid_: connector, intro (the act), referrer

**Gatekeeper**:
A high-leverage **Warm intro** who unlocks *many* **Leads** at once. The person worth befriending.
_Avoid_: hub, influencer

**Warm path**:
The chain **You → Warm intro(s) → Lead** that makes the introduction possible.
_Avoid_: route, degree chain

**Mutual**:
The shared **Connection** displayed for a **Lead** — the visible proof of the **Warm path**, i.e. the **Warm intro** you'd actually ask. (Column in the list view.)
_Avoid_: using "mutual" to mean any 1st-degree **Connection**

**Goal**:
The stated objective the feed ranks **Leads** against (e.g. "warm intro at Stripe"). Captured on first query and re-asked on a weekly cron.
_Avoid_: query, intent

**Why**:
The reasoning for surfacing a **Lead** — per-criterion bullets, each with a confidence indicator.
_Avoid_: explanation, thinking (UI label only)

**How**:
The recommended outreach for a **Lead**: channel + angle + a drafted opener. Draft only — never auto-sent.
_Avoid_: action, outreach

**Attendance-confidence**:
A score for whether a person will actually be at a given **Event**, fused from RSVP/attendee data + live social signal + LLM judgment.
_Avoid_: RSVP score, presence

**Event**:
A real-world gathering people attend, used as a serendipity signal connecting **You** to **Targets**.
_Avoid_: meetup, occasion

## Relationships

- **You** have many **Connections** (1st degree); each has a **Tie strength**.
- A **Warm path** links **You** → one or more **Warm intros** → a **Lead**.
- A **Gatekeeper** is a **Warm intro** sitting on the **Warm path** to many **Leads**.
- The feed mixes two row kinds: **Leads** (the end people you want to reach) and **Warm intros** (the people who can bridge you to them), both ranked against the **Goal**, each with a **Why** and a **How**.
- A **Mutual** is the **Connection** shown as proof of a **Lead**'s **Warm path** — i.e. the **Warm intro** to ask.
- **Attendance-confidence** scores a person against an **Event**, feeding the serendipity layer of ranking.

## Example dialogue

> **Dev:** "A row in the feed — is it always someone I want to reach?"
> **Domain expert:** "Two kinds. A **Lead** is the end person you actually want. A **Warm intro** is someone you already know who can put you in front of Leads — that row is the *path*, not the destination. Expand it and you see who they unlock."
> **Dev:** "And if one **Warm intro** unlocks thirty Leads?"
> **Domain expert:** "Then they're a **Gatekeeper** — we rank befriending them above any single intro."

## Flagged ambiguities

- "end users" / "leads" vs "warm intros" — resolved: **Leads** are the end people you want to reach; **Warm intros** are the people who introduce you to them. The feed lists both, badged.
- "mutual" was used to mean both *any 1st-degree connection* and *the shared bridge on a path* — resolved: **Mutual** = the **Warm intro** shown as proof of a **Warm path**; a plain 1st-degree person is a **Connection**.
- "score" vs "tie strength" — resolved: **Tie strength** = warmth of a relationship; **Score** = a row's rank against the **Goal**.
- "warm intro" vs "gatekeeper" — resolved: a **Gatekeeper** is a **Warm intro** that unlocks *many* **Leads**; not every **Warm intro** is a **Gatekeeper**.
