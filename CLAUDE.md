<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Verify, never assume

**Every time a turn rests on an assumption, an external fact, or a claim about a library/API/tool — verify it before stating it. Do not answer from memory.**

- **Library / framework / SDK / API docs** → use **Context7** (`resolve-library-id` → `query-docs`). Covers Convex, Next.js, React Flow, Fiber SDKs, OpenAI, Tailwind, etc.
- **Anything else** — capabilities, pricing, "does X API expose Y", market facts, comparisons, current state of a tool → use **Exa** (`web_search_exa`, then `web_fetch_exa` on the best URLs).
- State what was verified and cite the source (URL or `file:line`). If something could not be verified, say so explicitly and label it unverified.
- This applies to recommendations too: don't recommend an approach hinging on an unchecked capability — check it first.

## HTML Artifacts (plans, recaps, investigations)

Any plan, recap, or investigation explanation goes in a **self-contained HTML artifact**, not a long markdown dump in chat. Terminal reply stays a 2-3 line pointer to the file. Save under `artifacts/YYYY-MM-DD-<slug>.html` (keep `artifacts/` local-only via `.git/info/exclude`, never `.gitignore`). Open it in Chrome after writing.

**House style — "Cashmere + SF Pro Rounded" (light):**

- **Font:** `font-family: ui-rounded,"SF Pro Rounded","SF Pro Text",-apple-system,system-ui,sans-serif`. No web-font link, no Inter.
- **Compact header, ONE line.** No giant hero `<h1>` (it wastes a screen). Title ~23px/600. The state pill sits INLINE at the start of the title line, not as a standalone block above it. NO grey "id · total · date" meta line — fold any run/id into the lead sentence if it matters.
- **State pill (lifecycle):** exactly one of `plan` → `wip` → `review` → `shipped`, advanced as the work moves. Evolve the SAME file through states; don't spin a new artifact per stage.
- **Type hierarchy via size + WEIGHT + COLOR, not size alone.** Title 23px/600 ink, lead ~17px muted, h2 ~18px/600 ink, body 14-15px muted, meta 12px muted2. Heading = ink, body = muted, meta = muted2.
- **Numbered badges (28px, radius 9px, card border + soft shadow):** TINTED fill + matching colored border + colored numeral = PRIORITY (orange = do-first, blue = rest). NEUTRAL white card = plain sequence. Never black-on-grey.
- **Repo paths = kbd chip inline-right of the heading** (card bg, hairline border, radius 6px, `line-height:1.35`), text in muted. On the same line as the title, not below.
- **Ruthless prose, ≤60ch.** One short sentence per item. The one-line takeaway appears ONCE in the lead at top — never duplicated in a trailing legend or "read this way" callout. Cut footnote walls, redundant compare tables, and any block that only paraphrases what's already on screen.
- **Single column ~780px.** Minimize vertical scroll: the top of the doc should already show real content (table/steps), not chrome.
- Dates rendered human: `28 June 2026`. Filename stays ISO for sortability.

**CSS skeleton (copy, fill the body):**

```html
<style>
:root{
  --bg:oklch(0.957 0.008 85);--ink:oklch(0.235 0.004 75);
  --muted:oklch(0.55 0.009 80);--muted2:oklch(0.64 0.008 80);
  --card:oklch(1 0 0);--border:oklch(0.905 0.009 85);--hair:oklch(0.93 0.008 85);
  --shadow-sm:0 0 0 1px oklch(0.30 0.01 75/0.05),0 1px 2px oklch(0.30 0.01 75/0.05);
  --blue:oklch(0.48 0.14 252);--blue-bg:oklch(0.92 0.045 245);
  --orange:oklch(0.52 0.18 35);--orange-bg:oklch(0.93 0.05 40);
  --green:oklch(0.42 0.11 152);--green-bg:oklch(0.92 0.06 150);
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--muted);
  font-family:ui-rounded,"SF Pro Rounded","SF Pro Text",-apple-system,system-ui,sans-serif;
  font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:780px;margin:0 auto;padding:32px 28px 72px}
.state{display:inline-block;font-size:10.5px;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;color:var(--blue);background:var(--blue-bg);
  padding:2px 7px;border-radius:6px;vertical-align:middle;margin-right:10px}
h1{font-size:23px;line-height:1.25;font-weight:600;color:var(--ink);margin:0 0 10px;letter-spacing:-.01em}
.lead{font-size:17px;line-height:1.45;color:var(--muted);margin:0 0 30px}
.lead b{color:var(--ink);font-weight:600}
h2{font-size:18px;font-weight:600;color:var(--ink);margin:34px 0 14px;letter-spacing:-.01em}
table{width:100%;border-collapse:separate;border-spacing:0;background:var(--card);
  border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-sm);overflow:hidden}
td,th{text-align:left;padding:10px 14px;font-size:13.5px;border-bottom:1px solid var(--hair)}
tr:last-child td{border-bottom:none}
.item{display:flex;gap:14px;align-items:baseline;margin:0 0 18px}
.badge{flex:none;width:28px;height:28px;border-radius:9px;display:flex;align-items:center;
  justify-content:center;font-size:14px;font-weight:600;box-shadow:var(--shadow-sm);line-height:1}
.badge.b1{background:var(--orange-bg);color:var(--orange);
  border:1px solid color-mix(in oklch,var(--orange) 28%,transparent)}
.badge.b2{background:var(--blue-bg);color:var(--blue);
  border:1px solid color-mix(in oklch,var(--blue) 28%,transparent)}
kbd{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:11.5px;color:var(--muted);
  background:var(--card);border:1px solid var(--hair);border-radius:6px;padding:2px 6px;
  box-shadow:var(--shadow-sm);line-height:1.35;font-weight:400}
</style>
<!-- header: <h1><span class="state">plan</span>Title here</h1> -->
```
