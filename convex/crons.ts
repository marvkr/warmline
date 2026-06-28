import { cronJobs } from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// Daily proactive run: recompute bridges, then re-rank the latest ICP.
export const dailyRefresh = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ctx.runAction(internal.edges.computeEdges, {});
    const icp = await ctx.runQuery(api.icp.latest, {});
    if (icp) await ctx.runAction(internal.rank.rebuild, { icpId: icp._id });
    return null;
  },
});

const crons = cronJobs();
// 13:00 UTC daily.
crons.cron(
  "warmline daily refresh",
  "0 13 * * *",
  internal.crons.dailyRefresh,
  {},
);

export default crons;
