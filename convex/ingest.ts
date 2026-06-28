import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

// Seed ingest. Called by scripts/seed.mjs (local, PII stays on disk).
// Public mutations so the local Convex client can reach them — keep this
// deployment private / wipe before any real users.

async function findPerson(
  ctx: MutationCtx,
  linkedinUrl?: string,
  xHandle?: string,
): Promise<Doc<"persons"> | null> {
  if (linkedinUrl) {
    const p = await ctx.db
      .query("persons")
      .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", linkedinUrl))
      .first();
    if (p) return p;
  }
  if (xHandle) {
    const p = await ctx.db
      .query("persons")
      .withIndex("by_xHandle", (q) => q.eq("xHandle", xHandle))
      .first();
    if (p) return p;
  }
  return null;
}

// Fill only fields that are currently empty; never clobber existing data.
function fillMissing(
  existing: Doc<"persons">,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(incoming)) {
    if (val === undefined) continue;
    if ((existing as Record<string, unknown>)[k] === undefined) patch[k] = val;
  }
  return patch;
}

export const ingestSelf = mutation({
  args: {
    name: v.string(),
    linkedinUrl: v.optional(v.string()),
    xHandle: v.optional(v.string()),
  },
  returns: v.id("persons"),
  handler: async (ctx, args) => {
    const existing = await findPerson(ctx, args.linkedinUrl, args.xHandle);
    if (existing) {
      await ctx.db.patch(existing._id, { isSelf: true });
      return existing._id;
    }
    return await ctx.db.insert("persons", {
      name: args.name,
      linkedinUrl: args.linkedinUrl,
      xHandle: args.xHandle,
      isSelf: true,
      role: "connector",
      relationshipToYou: "connected",
    });
  },
});

const connectionRow = v.object({
  name: v.string(),
  headline: v.optional(v.string()),
  company: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  xHandle: v.optional(v.string()),
  tieStrength: v.optional(v.number()),
});

// Your real 1st-degree connections → role connector, relationshipToYou connected.
export const ingestConnections = mutation({
  args: { rows: v.array(connectionRow) },
  returns: v.object({ inserted: v.number(), patched: v.number() }),
  handler: async (ctx, args) => {
    let inserted = 0;
    let patched = 0;
    for (const row of args.rows) {
      const existing = await findPerson(ctx, row.linkedinUrl, row.xHandle);
      if (existing) {
        const patch = fillMissing(existing, {
          headline: row.headline,
          company: row.company,
          xHandle: row.xHandle,
        });
        if (row.tieStrength !== undefined) patch.tieStrength = row.tieStrength;
        // These rows come from your real connections export → by definition connected.
        if (existing.relationshipToYou !== "connected")
          patch.relationshipToYou = "connected";
        if (Object.keys(patch).length) await ctx.db.patch(existing._id, patch);
        patched++;
      } else {
        await ctx.db.insert("persons", {
          name: row.name,
          headline: row.headline,
          company: row.company,
          linkedinUrl: row.linkedinUrl,
          xHandle: row.xHandle,
          tieStrength: row.tieStrength,
          isSelf: false,
          role: "connector",
          relationshipToYou: "connected",
        });
        inserted++;
      }
    }
    return { inserted, patched };
  },
});

const leadRow = v.object({
  name: v.string(),
  linkedinUrl: v.optional(v.string()),
  xHandle: v.optional(v.string()),
  eventName: v.optional(v.string()),
  eventDate: v.optional(v.number()),
  confidence: v.optional(v.number()),
});

async function upsertEvent(
  ctx: MutationCtx,
  name: string,
  date?: number,
): Promise<Id<"events">> {
  const existing = await ctx.db
    .query("events")
    .withIndex("by_name", (q) => q.eq("name", name))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("events", { name, date });
}

// Config Leads rows → role lead. If already a connection, keep connected + promote to lead.
export const ingestLeads = mutation({
  args: { rows: v.array(leadRow) },
  returns: v.object({ leads: v.number(), attendances: v.number() }),
  handler: async (ctx, args) => {
    let leads = 0;
    let attendances = 0;
    for (const row of args.rows) {
      const existing = await findPerson(ctx, row.linkedinUrl, row.xHandle);
      let personId: Id<"persons">;
      if (existing) {
        // A lead you already know (the verified overlaps). Promote to lead, keep connected.
        await ctx.db.patch(existing._id, { role: "lead" });
        personId = existing._id;
      } else {
        personId = await ctx.db.insert("persons", {
          name: row.name,
          linkedinUrl: row.linkedinUrl,
          xHandle: row.xHandle,
          isSelf: false,
          role: "lead",
          relationshipToYou: "not_connected",
        });
      }
      leads++;

      if (row.eventName) {
        const eventId = await upsertEvent(ctx, row.eventName, row.eventDate);
        const already = await ctx.db
          .query("attendance")
          .withIndex("by_person_and_event", (q) =>
            q.eq("personId", personId).eq("eventId", eventId),
          )
          .first();
        if (!already) {
          await ctx.db.insert("attendance", {
            personId,
            eventId,
            confidence: row.confidence ?? 1,
          });
          attendances++;
        }
      }
    }
    return { leads, attendances };
  },
});

// Dev reset — delete one bounded batch across the Warmline tables; the loader
// calls this in a loop until it returns 0. Keeps each call within transaction limits.
export const clearBatch = mutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    let deleted = 0;
    const tables = [
      "persons",
      "edges",
      "events",
      "attendance",
      "recommendations",
      "feedback",
    ] as const;
    for (const table of tables) {
      const rows = await ctx.db.query(table).take(300);
      for (const r of rows) {
        await ctx.db.delete(r._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
