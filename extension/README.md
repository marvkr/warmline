# Warmline — LinkedIn Mutuals extension

A tiny Manifest V3 Chrome extension. When you open a **Lead's** LinkedIn profile
(`linkedin.com/in/<slug>`), it reads the visible **mutual connections** section —
the **Connectors** on your **Warm path** — and POSTs them to Warmline's Convex
backend, which stores each as a `linkedin_mutual` edge (`connector → lead`).

Plain JavaScript. No build step, no bundler, no dependencies.

```
extension/
  manifest.json   MV3 manifest (content script on /in/*, SW background)
  content.js      reads the mutual-connections DOM on a profile page
  background.js   service worker: queues + POSTs to Convex, retries on failure
  README.md       this file
```

## HTTP contract (real)

```
POST <CONVEX_HTTP_URL>/extension/mutuals
Content-Type: application/json

{ "leadSlug": "jane-doe-123", "leadName": "Jane Doe",
  "mutuals": [ { "name": "Sam Lee", "slug": "sam-lee-456" }, ... ] }

200 OK → { "edges": 3 }
```

Implemented in `convex/http.ts` + `convex/extension.ts`. The endpoint is **idempotent**:
re-posting the same lead/mutuals does not create duplicate edges, so retries are safe.
`mutuals` entries without a `slug` are ignored server-side.

## Setup

1. **Set your Convex HTTP URL.** Convex serves `httpRouter` routes from the
   `*.convex.site` domain (NOT `*.convex.cloud`). Find it in `.env.local` as
   `NEXT_PUBLIC_CONVEX_SITE_URL` (e.g. `https://fantastic-gazelle-504.convex.site`).

   Either edit the constant in `background.js`:
   ```js
   const DEFAULT_CONVEX_HTTP_URL = "https://<your-id>.convex.site";
   ```
   …or set it at runtime from the service-worker console (see step 3):
   ```js
   chrome.storage.local.set({ "warmline:convexHttpUrl": "https://<your-id>.convex.site" })
   ```

2. **Load unpacked.**
   - Open `chrome://extensions`.
   - Toggle **Developer mode** on (top-right).
   - Click **Load unpacked** and select this `extension/` folder.

3. **Verify.** On `chrome://extensions`, click the extension's **service worker**
   link to open its console. Open any `linkedin.com/in/...` profile that has mutual
   connections — you should see `[Warmline] sent …` (content script) and
   `[Warmline] ingested … → N edge(s)` (background) once the POST returns 200.

## How it works

- `content.js` runs at `document_idle` on `/in/*`. LinkedIn is a SPA and hydrates
  late, so it polls (~10s) and watches the DOM with a `MutationObserver`, sending
  one payload once the mutual-connections section appears. It only **reads** the
  DOM — no clicks, no navigation.
- `background.js` merges payloads per `leadSlug` into a `chrome.storage.local`
  queue, POSTs each item, and clears it on `200`. Offline / `5xx` keep the item
  and a `chrome.alarms` timer retries ~every minute; non-retryable `4xx` are dropped.

## ⚠️ Selectors will drift

LinkedIn rotates its CSS class names constantly. Every DOM selector in `content.js`
is best-effort with fallbacks and flagged `SELECTOR:` in comments. If capture stops
working, those are the lines to update. Note many profile layouts render only the
mutuals' avatars (linking to a search facet, not per-person `/in/` links), so live
capture can legitimately return few or zero slug-bearing mutuals.

## ⚠️ Pacing / ban caveat — read before scraping

LinkedIn aggressively rate-limits and bans automated profile access. **Keep it to
~80 profiles/day, paced like a human** (this extension is passive — it only fires
when *you* manually open a profile — but bulk-opening profiles still trips limits).

For the hackathon **demo, use pre-cached data, not live scraping.** Pull a handful
of real profiles ahead of time to seed the graph, then demo against that. Treat live
capture as opportunistic enrichment, never as a bulk crawler.
