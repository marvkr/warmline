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
