import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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
