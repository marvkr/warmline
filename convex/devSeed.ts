import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const clearRecs = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const recs = await ctx.db.query("recommendations").collect();
    for (const r of recs) await ctx.db.delete(r._id);
    return { deleted: recs.length };
  },
});

// Clear a company field across persons (set to undefined).
export const clearCompany = internalMutation({
  args: { company: v.string() },
  returns: v.object({ cleared: v.number() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("persons")
      .withIndex("by_company", (q) => q.eq("company", args.company))
      .take(500);
    for (const p of rows) await ctx.db.patch(p._id, { company: undefined });
    return { cleared: rows.length };
  },
});

// Rename a company across the graph (e.g. "Stealth" → "Stripe" for the demo).
export const renameCompany = internalMutation({
  args: { from: v.string(), to: v.string() },
  returns: v.object({ updated: v.number() }),
  handler: async (ctx, args) => {
    let updated = 0;
    const rows = await ctx.db
      .query("persons")
      .withIndex("by_company", (q) => q.eq("company", args.from))
      .take(500);
    for (const p of rows) {
      await ctx.db.patch(p._id, { company: args.to });
      updated++;
    }
    return { updated };
  },
});

// Dev helper: mark a user's already-uploaded sources as connected, so the
// Connectors page reflects the data that's already in the graph.
export const markSourcesConnected = internalMutation({
  args: { email: v.string() },
  returns: v.object({ inserted: v.number(), userId: v.string() }),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").take(200);
    const user = users.find((u) => u.email === args.email);
    if (!user) throw new Error(`no user with email ${args.email}`);

    const sources = [
      { provider: "linkedin" as const, method: "manual" as const, label: "LinkedIn data" },
      { provider: "twitter" as const, method: "manual" as const, label: "X data" },
      { provider: "extension" as const, method: "extension" as const, label: "Chrome extension" },
    ];
    let inserted = 0;
    for (const s of sources) {
      const existing = await ctx.db
        .query("connectors")
        .withIndex("by_user_provider", (q) =>
          q.eq("userId", user._id).eq("provider", s.provider),
        )
        .first();
      if (existing) continue;
      await ctx.db.insert("connectors", {
        userId: user._id,
        provider: s.provider,
        method: s.method,
        status: "active",
        label: s.label,
      });
      inserted++;
    }
    return { inserted, userId: user._id };
  },
});
