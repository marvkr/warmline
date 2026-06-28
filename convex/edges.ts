import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

// Backward-resolution: build connector→lead bridges from data we already have.
// v1 signal = shared_company (exact company match). X-mutual-follow / engagement
// edges come from Fiber actions later. Run via `computeEdges`.

// Only wipe shared_company edges — never the linkedin_mutual / x_mutual_follow /
// engagement edges (those come from the extension / Fiber and must survive recompute).
export const clearEdges = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    let deleted = 0;
    const batch = await ctx.db
      .query("edges")
      .withIndex("by_type", (q) => q.eq("type", "shared_company"))
      .take(500);
    for (const e of batch) {
      await ctx.db.delete(e._id);
      deleted++;
    }
    return { deleted };
  },
});

export const leadPage = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    ids: v.array(v.id("persons")),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("persons")
      .withIndex("by_role", (q) => q.eq("role", "lead"))
      .paginate(args.paginationOpts);
    return {
      ids: page.page.map((p) => p._id),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

// Link same-company connectors to one lead; returns the connector ids linked.
export const linkLeadEdges = internalMutation({
  args: { leadId: v.id("persons") },
  returns: v.array(v.id("persons")),
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead || !lead.company) return [];
    // Pull more than we need, since leads/self at the same company would otherwise
    // consume the cap before any connector is reached.
    const sameCompany = await ctx.db
      .query("persons")
      .withIndex("by_company", (q) => q.eq("company", lead.company))
      .take(200);
    const connectors = sameCompany
      .filter((c) => c.role === "connector" && !c.isSelf && c._id !== lead._id)
      .slice(0, 50);
    const linked: Id<"persons">[] = [];
    for (const c of connectors) {
      await ctx.db.insert("edges", {
        from: c._id,
        to: lead._id,
        type: "shared_company",
        confidence: 0.5,
        evidence: `Both at ${lead.company}`,
      });
      linked.push(c._id);
    }
    return linked;
  },
});

export const setUnlockValues = internalMutation({
  args: {
    pairs: v.array(v.object({ id: v.id("persons"), count: v.number() })),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const { id, count } of args.pairs) {
      const p = await ctx.db.get(id);
      if (p) await ctx.db.patch(id, { unlockValue: count });
    }
    return null;
  },
});

export const computeEdges = internalAction({
  args: {},
  returns: v.object({ leads: v.number(), edges: v.number() }),
  handler: async (ctx) => {
    // 1. wipe existing edges (batched)
    for (;;) {
      const { deleted } = await ctx.runMutation(internal.edges.clearEdges, {});
      if (deleted === 0) break;
    }
    // 2. link same-company edges per lead, tallying connector unlock counts
    const unlock = new Map<Id<"persons">, number>();
    let leads = 0;
    let edges = 0;
    let cursor: string | null = null;
    for (;;) {
      const page: {
        ids: Id<"persons">[];
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runQuery(internal.edges.leadPage, {
        paginationOpts: { numItems: 100, cursor },
      });
      for (const leadId of page.ids) {
        const linked: Id<"persons">[] = await ctx.runMutation(
          internal.edges.linkLeadEdges,
          { leadId },
        );
        leads++;
        edges += linked.length;
        for (const id of linked) unlock.set(id, (unlock.get(id) ?? 0) + 1);
      }
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    // 3. write unlock values in batches
    const entries = [...unlock.entries()].map(([id, count]) => ({ id, count }));
    for (let i = 0; i < entries.length; i += 200) {
      await ctx.runMutation(internal.edges.setUnlockValues, {
        pairs: entries.slice(i, i + 200),
      });
    }
    return { leads, edges };
  },
});
