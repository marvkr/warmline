# Mutual connections via a browser extension (the user's own session)

## Status

accepted

## Context

Warm intros to a Lead = the people You and the Lead both know (mutual connections). No API exposes this (see ADR 0001): mutuals are visible only in LinkedIn's logged-in UI, relative to the viewing member. The only place to read them is inside the user's own authenticated browser.

## Decision

Ship a **Manifest V3 Chrome extension, loaded unpacked (developer mode)**. A content script on `linkedin.com/in/*` reads the "mutual connections" box from the DOM and POSTs the names to a Convex HTTP action, which stores them as warm-intro edges. The extension is run on a **Lead's** profile; the mutuals returned are the warm intros to that Lead.

**Operate it passively where possible** — read profiles the user organically opens, rather than auto-navigating. Passive reading is genuinely the user's own behavior, so it carries no automation footprint. If broader coverage is needed, any active fetching must be low-volume (≤~80 profiles/day) and human-paced; LinkedIn enforcement is pattern-based, and bursty auto-browsing risks account restriction (verified: phantombuster/dealsflow 2026, ~80–150 views/day soft cap).

**For the demo: pre-cache offline, never scrape live on camera.** Real mutuals are pulled ahead of time into Convex; the recorded demo reads cached data. Remaining 2nd-degree is mocked with a consenting account's real connection export (Zach's).

## Consequences

- We obtain true mutual-connection data without any API, at the cost of running in the user's session.
- Account-ban risk is real but bounded by passive/low-volume operation; the demo avoids it entirely by pre-caching.
- This is the productionization path, framed honestly on camera as "here's how it scales," not claimed as a live stage feature.
