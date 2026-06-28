/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// Seed one icp + one person and return their ids.
async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const icpId = await ctx.db.insert("icp", {
      text: "AI founders",
      source: {},
    });
    const personId = await ctx.db.insert("persons", {
      name: "Han Wang",
      isSelf: false,
      role: "lead",
      relationshipToYou: "not_connected",
    });
    return { icpId, personId };
  });
}

test("vote inserts a feedback row", async () => {
  const t = convexTest(schema, modules);
  const { icpId, personId } = await seed(t);

  const id = await t.mutation(api.feedback.vote, {
    icpId,
    personId,
    vote: "up",
  });
  expect(id).toBeTruthy();

  const rows = await t.run(async (ctx) => ctx.db.query("feedback").collect());
  expect(rows.length).toBe(1);
  expect(rows[0].vote).toBe("up");
});

test("voting again for the same (icp, person) replaces — one row, new value", async () => {
  const t = convexTest(schema, modules);
  const { icpId, personId } = await seed(t);

  await t.mutation(api.feedback.vote, { icpId, personId, vote: "up" });
  await t.mutation(api.feedback.vote, { icpId, personId, vote: "down" });

  const rows = await t.run(async (ctx) => ctx.db.query("feedback").collect());
  expect(rows.length).toBe(1);
  expect(rows[0].vote).toBe("down");
});

test("forIcp returns the votes for the icp", async () => {
  const t = convexTest(schema, modules);
  const { icpId, personId } = await seed(t);

  await t.mutation(api.feedback.vote, { icpId, personId, vote: "up" });

  const votes = await t.query(api.feedback.forIcp, { icpId });
  expect(votes).toEqual([{ personId, vote: "up" }]);
});
