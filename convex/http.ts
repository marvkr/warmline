import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Browser extension posts mutual connections read off a Lead's LinkedIn profile.
http.route({
  path: "/extension/mutuals",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    let body: {
      leadSlug?: string;
      leadName?: string;
      mutuals?: { name: string; slug: string }[];
    };
    try {
      body = await req.json();
    } catch {
      return new Response("bad json", { status: 400, headers: cors });
    }
    if (!body.leadSlug) {
      return new Response("leadSlug required", { status: 400, headers: cors });
    }
    // Optional shared-secret: if WARMLINE_EXTENSION_TOKEN is set on the deploy,
    // require a matching Authorization: Bearer header. Unset → open (demo).
    const token = process.env.WARMLINE_EXTENSION_TOKEN;
    if (token && req.headers.get("Authorization") !== `Bearer ${token}`) {
      return new Response("unauthorized", { status: 401, headers: cors });
    }
    const result = await ctx.runMutation(internal.extension.ingestMutuals, {
      leadSlug: body.leadSlug,
      leadName: body.leadName,
      mutuals: (body.mutuals ?? []).filter((m) => m && m.slug),
    });
    return Response.json(result, { headers: cors });
  }),
});

http.route({
  path: "/extension/mutuals",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { headers: cors })),
});

export default http;
