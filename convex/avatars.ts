import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Profile-picture enrichment. For the top people (by tie strength) that have a
// LinkedIn slug but no avatar yet, resolve their picture via Fiber KitchenSink,
// download it, and cache it ONCE in Convex storage (LinkedIn blocks hotlinking,
// so we store the bytes, not the URL). Run via `npx convex run avatars:enrichTop`.

function findProfilePic(obj: unknown, depth = 0): string | undefined {
  if (depth > 8 || obj === null || typeof obj !== "object") return undefined;
  for (const [k, val] of Object.entries(obj as Record<string, unknown>)) {
    if (
      (k === "profile_pic" || k === "profilePic" || k === "profilePicture") &&
      typeof val === "string" &&
      val.startsWith("http")
    )
      return val;
    if (typeof val === "object") {
      const found = findProfilePic(val, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

export const needingAvatars = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.object({ id: v.id("persons"), slug: v.string() })),
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("persons")
      .withIndex("by_role", (q) => q.eq("role", "lead"))
      .take(300);
    const connectors = await ctx.db
      .query("persons")
      .withIndex("by_role", (q) => q.eq("role", "connector"))
      .take(300);
    return [...leads, ...connectors]
      .filter((p) => !p.isSelf && !p.avatarUrl && !!p.linkedinUrl)
      .sort((a, b) => (b.tieStrength ?? 0) - (a.tieStrength ?? 0))
      .slice(0, args.limit)
      .map((p) => ({ id: p._id, slug: p.linkedinUrl as string }));
  },
});

export const setAvatar = internalMutation({
  args: { personId: v.id("persons"), url: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.personId, { avatarUrl: args.url });
    return null;
  },
});

export const enrichTop = internalAction({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ done: v.number(), failed: v.number() }),
  handler: async (ctx, args) => {
    const apiKey = process.env.FIBER_API_KEY;
    if (!apiKey) throw new Error("FIBER_API_KEY not set");
    const targets: { id: Id<"persons">; slug: string }[] =
      await ctx.runQuery(internal.avatars.needingAvatars, {
        limit: args.limit ?? 40,
      });
    let done = 0;
    let failed = 0;
    for (const t of targets) {
      try {
        const res = await fetch("https://api.fiber.ai/v1/kitchen-sink/person", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            profileIdentifier: { identifier: "linkedinSlug", value: t.slug },
          }),
        });
        if (!res.ok) {
          failed++;
          continue;
        }
        const picUrl = findProfilePic(await res.json());
        if (!picUrl) {
          failed++;
          continue;
        }
        const img = await fetch(picUrl);
        if (!img.ok) {
          failed++;
          continue;
        }
        const storageId = await ctx.storage.store(await img.blob());
        const url = await ctx.storage.getUrl(storageId);
        if (!url) {
          failed++;
          continue;
        }
        await ctx.runMutation(internal.avatars.setAvatar, {
          personId: t.id,
          url,
        });
        done++;
      } catch {
        failed++;
      }
    }
    return { done, failed };
  },
});
