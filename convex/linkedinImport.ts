import { v } from "convex/values";
import {
  action,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { unzipSync, strFromU8 } from "fflate";
import { parseConnections, type ConnRow } from "./linkedinCsv";

// Parse an uploaded LinkedIn data export (the ZIP from "Download larger data
// archive") and turn Connections.csv into `persons` rows — your 1st-degree
// connections, the largest pool of warm intros. Stable, well-known schema:
// First Name, Last Name, URL, Email Address, Company, Position, Connected On.
export const parseLinkedInExport = action({
  args: { storageId: v.id("_storage") },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("Upload not found in storage");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    const files = unzipSync(bytes);
    const key = Object.keys(files).find((k) => /connections\.csv$/i.test(k));
    if (!key) throw new Error("Connections.csv not found in the export ZIP");

    const rows = parseConnections(strFromU8(files[key]));
    let imported = 0;
    let skipped = 0;
    // Batch to stay well under Convex's per-call argument size limit.
    for (let i = 0; i < rows.length; i += 200) {
      const res = await ctx.runMutation(
        internal.linkedinImport.importConnections,
        { rows: rows.slice(i, i + 200) },
      );
      imported += res.imported;
      skipped += res.skipped;
    }
    return { imported, skipped };
  },
});

const connectionRow = v.object({
  name: v.string(),
  headline: v.optional(v.string()),
  company: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
});

// Insert connections as `persons`, deduped by LinkedIn URL. Internal — only the
// parse action calls it.
export const importConnections = internalMutation({
  args: { rows: v.array(connectionRow) },
  returns: v.object({ imported: v.number(), skipped: v.number() }),
  handler: async (ctx, args) => {
    let imported = 0;
    let skipped = 0;
    for (const row of args.rows) {
      if (!row.name) {
        skipped++;
        continue;
      }
      if (await isDuplicate(ctx, row)) {
        skipped++;
        continue;
      }
      await ctx.db.insert("persons", {
        name: row.name,
        headline: row.headline,
        company: row.company,
        linkedinUrl: row.linkedinUrl,
        isSelf: false,
        role: "connector",
        relationshipToYou: "connected",
      });
      imported++;
    }
    return { imported, skipped };
  },
});

// Dedup an incoming connection against existing persons: by LinkedIn URL when
// present (precise), else by name within the same company (URL is missing on a
// minority of rows; without this, re-uploading would duplicate them).
async function isDuplicate(ctx: MutationCtx, row: ConnRow): Promise<boolean> {
  if (row.linkedinUrl) {
    const byUrl = await ctx.db
      .query("persons")
      .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", row.linkedinUrl))
      .first();
    return byUrl !== null;
  }
  if (row.company) {
    const sameCompany = await ctx.db
      .query("persons")
      .withIndex("by_company", (q) => q.eq("company", row.company))
      .collect();
    return sameCompany.some((p) => p.name === row.name);
  }
  return false;
}

