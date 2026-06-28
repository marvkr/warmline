// Warmline demo-data loader (Convex).
//
// The Convex backend has no domain tables yet (convex/schema.ts is auth-only), so this loader runs
// as a DRY RUN by default: it reads seed/demo-data.json, normalizes it into a per-table insert plan,
// and prints what WOULD be inserted. That makes it runnable today, and gives Marvin the exact shape
// to wire a real mutation against.
//
//   node seed/load.mjs            # dry run: print the insert plan + counts
//   node seed/load.mjs --json     # emit the normalized insert plan as JSON (pipe to a real loader)
//
// To load for real once the backend exists, add a Convex mutation like:
//
//   // convex/seed.ts
//   import { mutation } from "./_generated/server";
//   import { v } from "convex/values";
//   export const loadDemo = mutation({
//     args: { plan: v.any() },               // the object printed by `node seed/load.mjs --json`
//     handler: async (ctx, { plan }) => {
//       for (const table of ["goals", "people", "events", "edges", "recommendations"])
//         for (const row of plan[table]) await ctx.db.insert(table, row);
//     },
//   });
//
// ...then push the plan with the Convex client, e.g.:
//   import { ConvexHttpClient } from "convex/browser";
//   const client = new ConvexHttpClient(process.env.CONVEX_URL);
//   await client.mutation("seed:loadDemo", { plan });

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(join(HERE, "demo-data.json"), "utf8"));

// Normalized insert plan — one array per Convex table. Field names mirror seed/SCHEMA.md; Marvin can
// rename here in one place if the finalized backend schema differs.
const plan = {
  goals: data.goals,
  people: data.people,
  events: data.events,
  edges: data.edges,
  recommendations: data.recommendations,
};

if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(plan, null, 2) + "\n");
} else {
  console.log("Warmline demo-data loader — DRY RUN (no Convex backend wired yet).\n");
  for (const [table, rows] of Object.entries(plan)) {
    console.log(`  ${table.padEnd(16)} ${rows.length} row(s)`);
  }
  console.log(`\n  judge toggle (flags.include_judge_edges): ${data.flags?.include_judge_edges}`);
  console.log("\nNo data was written. Re-run with --json to emit the insert plan, or wire the");
  console.log("convex/seed.ts mutation shown at the top of this file to load for real.");
}
