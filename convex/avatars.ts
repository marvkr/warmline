import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Resolve a profile-pic URL from any of: Fiber KitchenSink (LinkedIn), unavatar
// by X handle, unavatar by LinkedIn slug. Returns the first that yields an image.
async function resolvePic(
  apiKey: string,
  slug?: string,
  xHandle?: string,
): Promise<string | undefined> {
  if (slug) {
    try {
      const res = await fetch("https://api.fiber.ai/v1/kitchen-sink/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          profileIdentifier: { identifier: "linkedinSlug", value: slug },
        }),
      });
      if (res.ok) {
        const pic = findProfilePic(await res.json());
        if (pic) return pic;
      }
    } catch {
      /* fall through */
    }
  }
  const probe = async (u: string): Promise<string | undefined> => {
    try {
      const r = await fetch(u);
      if (r.ok && r.headers.get("content-type")?.startsWith("image")) return u;
    } catch {
      /* ignore */
    }
    return undefined;
  };
  if (xHandle) {
    const u = await probe(
      `https://unavatar.io/twitter/${xHandle.replace(/^@/, "")}?fallback=false`,
    );
    if (u) return u;
  }
  if (slug) {
    return probe(`https://unavatar.io/linkedin/${slug}?fallback=false`);
  }
  return undefined;
}

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
  returns: v.array(
    v.object({
      id: v.id("persons"),
      slug: v.optional(v.string()),
      xHandle: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("persons")
      .withIndex("by_role", (q) => q.eq("role", "lead"))
      .take(400);
    const connectors = await ctx.db
      .query("persons")
      .withIndex("by_role", (q) => q.eq("role", "connector"))
      .take(400);
    // Include self; anyone with a LinkedIn slug OR an X handle can be resolved.
    return [...leads, ...connectors]
      .filter((p) => !p.avatarUrl && (!!p.linkedinUrl || !!p.xHandle))
      .sort((a, b) => (b.tieStrength ?? 0) - (a.tieStrength ?? 0))
      .slice(0, args.limit)
      .map((p) => ({ id: p._id, slug: p.linkedinUrl, xHandle: p.xHandle }));
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
    const targets: {
      id: Id<"persons">;
      slug?: string;
      xHandle?: string;
    }[] = await ctx.runQuery(internal.avatars.needingAvatars, {
      limit: args.limit ?? 40,
    });
    let done = 0;
    let failed = 0;
    for (const t of targets) {
      if (await storeAvatar(ctx, apiKey, t.id, t.slug, t.xHandle)) done++;
      else failed++;
    }
    return { done, failed };
  },
});

// Helper: resolve + download + cache a person's avatar. Returns true on success.
async function storeAvatar(
  ctx: { storage: { store: (b: Blob) => Promise<Id<"_storage">>; getUrl: (id: Id<"_storage">) => Promise<string | null> }; runMutation: (ref: typeof internal.avatars.setAvatar, args: { personId: Id<"persons">; url: string }) => Promise<null> },
  apiKey: string,
  personId: Id<"persons">,
  slug?: string,
  xHandle?: string,
): Promise<boolean> {
  try {
    const picUrl = await resolvePic(apiKey, slug, xHandle);
    if (!picUrl) return false;
    const img = await fetch(picUrl);
    if (!img.ok) return false;
    const storageId = await ctx.storage.store(await img.blob());
    const url = await ctx.storage.getUrl(storageId);
    if (!url) return false;
    await ctx.runMutation(internal.avatars.setAvatar, { personId, url });
    return true;
  } catch {
    return false;
  }
}

// Enrich exactly the people currently in the feed (targets the visible rows,
// not top-by-tie). Run via `npx convex run avatars:enrichFeed`.
export const enrichFeed = internalAction({
  args: {},
  returns: v.object({ done: v.number(), failed: v.number() }),
  handler: async (ctx) => {
    const apiKey = process.env.FIBER_API_KEY;
    if (!apiKey) throw new Error("FIBER_API_KEY not set");
    const rows = await ctx.runQuery(api.feed.list, { limit: 40 });
    let done = 0;
    let failed = 0;
    for (const r of rows) {
      if (r.avatarUrl) continue;
      if (await storeAvatar(ctx, apiKey, r.id, r.linkedinUrl, r.xHandle)) done++;
      else failed++;
    }
    return { done, failed };
  },
});
