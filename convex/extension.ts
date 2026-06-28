import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

// Receives mutual connections read off a Lead's LinkedIn profile by the browser
// extension, and stores them as linkedin_mutual edges (connector → lead).

async function findOrCreate(
  ctx: MutationCtx,
  slug: string,
  name: string,
  role: "lead" | "connector",
): Promise<Id<"persons">> {
  const existing = await ctx.db
    .query("persons")
    .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", slug))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("persons", {
    name,
    linkedinUrl: slug,
    isSelf: false,
    role,
    relationshipToYou: role === "connector" ? "connected" : "not_connected",
  });
}

export const ingestMutuals = internalMutation({
  args: {
    leadSlug: v.string(),
    leadName: v.optional(v.string()),
    mutuals: v.array(v.object({ name: v.string(), slug: v.string() })),
  },
  returns: v.object({ edges: v.number() }),
  handler: async (ctx, args) => {
    const leadId = await findOrCreate(
      ctx,
      args.leadSlug,
      args.leadName ?? args.leadSlug,
      "lead",
    );
    let edges = 0;
    for (const m of args.mutuals) {
      if (!m.slug) continue;
      const connectorId = await findOrCreate(ctx, m.slug, m.name, "connector");
      const fromEdges = await ctx.db
        .query("edges")
        .withIndex("by_from", (q) => q.eq("from", connectorId))
        .take(100);
      const dup = fromEdges.some(
        (e) => e.to === leadId && e.type === "linkedin_mutual",
      );
      if (dup) continue;
      await ctx.db.insert("edges", {
        from: connectorId,
        to: leadId,
        type: "linkedin_mutual",
        confidence: 0.9,
        evidence: "Mutual connection on LinkedIn",
      });
      edges++;
    }
    await ctx.db.patch(leadId, { mutualsStatus: "done" });
    return { edges };
  },
});

export const pendingLeads = internalQuery({
  args: {},
  returns: v.array(v.object({ slug: v.string(), name: v.string() })),
  handler: async (ctx) => {
    const leads = await ctx.db
      .query("persons")
      .withIndex("by_role", (q) => q.eq("role", "lead"))
      .collect();
    return leads
      .filter((p) => p.mutualsStatus !== "done" && p.linkedinUrl)
      .map((p) => ({ slug: p.linkedinUrl!, name: p.name }));
  },
});
