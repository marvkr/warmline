import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Thumbs up/down on a feed row. Replaces any prior vote for the same (icp, person).
// The next rank run reads these to nudge the ICP vector.
export const vote = mutation({
  args: {
    icpId: v.id("icp"),
    personId: v.id("persons"),
    vote: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.id("feedback"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("feedback")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .take(20);
    for (const f of existing) {
      if (f.icpId === args.icpId) await ctx.db.delete(f._id);
    }
    return await ctx.db.insert("feedback", {
      icpId: args.icpId,
      personId: args.personId,
      vote: args.vote,
    });
  },
});

export const forIcp = query({
  args: { icpId: v.id("icp") },
  returns: v.array(
    v.object({
      personId: v.id("persons"),
      vote: v.union(v.literal("up"), v.literal("down")),
    }),
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("feedback")
      .withIndex("by_icp", (q) => q.eq("icpId", args.icpId))
      .take(500);
    return rows.map((r) => ({ personId: r.personId, vote: r.vote }));
  },
});
