/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("mergePersons: moves edge/recommendation/attendance, fills fields, deletes drop", async () => {
  const t = convexTest(schema, modules);

  const seed = await t.run(async (ctx) => {
    // keep: connector, missing a company.
    const keepId = await ctx.db.insert("persons", {
      name: "Han Wang",
      isSelf: false,
      role: "connector",
      relationshipToYou: "connected",
    });
    // drop: lead, HAS a company (the field keep is missing).
    const dropId = await ctx.db.insert("persons", {
      name: "Han Wang",
      company: "Mintlify",
      isSelf: false,
      role: "lead",
      relationshipToYou: "not_connected",
    });
    // a lead that drop has an outgoing edge to.
    const someLead = await ctx.db.insert("persons", {
      name: "Target Lead",
      isSelf: false,
      role: "lead",
      relationshipToYou: "not_connected",
    });
    const edgeId = await ctx.db.insert("edges", {
      from: dropId,
      to: someLead,
      type: "linkedin_mutual",
      confidence: 0.9,
      evidence: "shared company",
    });
    const icpId = await ctx.db.insert("icp", { text: "founders", source: {} });
    const recId = await ctx.db.insert("recommendations", {
      personId: dropId,
      icpId,
      kind: "lead",
      score: 0.5,
      whyBullets: [],
      how: ["x", "warm"],
      opener: "hi",
      unlocksIds: [],
    });
    const eventId = await ctx.db.insert("events", { name: "YC Demo Day" });
    const attId = await ctx.db.insert("attendance", {
      personId: dropId,
      eventId,
      confidence: 0.8,
    });
    return { keepId, dropId, edgeId, recId, attId };
  });

  const res = await t.mutation(internal.resolve.mergePersons, {
    keepId: seed.keepId,
    dropId: seed.dropId,
  });
  expect(res).toEqual({ edges: 1, attendance: 1, recommendations: 1 });

  await t.run(async (ctx) => {
    // drop is deleted.
    expect(await ctx.db.get(seed.dropId)).toBeNull();
    // all references now point to keep.
    const edge = await ctx.db.get(seed.edgeId);
    const rec = await ctx.db.get(seed.recId);
    const att = await ctx.db.get(seed.attId);
    expect(edge?.from).toBe(seed.keepId);
    expect(rec?.personId).toBe(seed.keepId);
    expect(att?.personId).toBe(seed.keepId);
    // keep gained drop's missing field + the lead role wins over connector.
    const keep = await ctx.db.get(seed.keepId);
    expect(keep?.company).toBe("Mintlify");
    expect(keep?.role).toBe("lead");
  });
});

test("mergePersons: lead role on drop overrides a connector keep", async () => {
  const t = convexTest(schema, modules);

  const ids = await t.run(async (ctx) => {
    const keepId = await ctx.db.insert("persons", {
      name: "Keep",
      company: "Stripe",
      isSelf: false,
      role: "connector",
      relationshipToYou: "connected",
    });
    const dropId = await ctx.db.insert("persons", {
      name: "Drop",
      isSelf: false,
      role: "lead",
      relationshipToYou: "not_connected",
    });
    return { keepId, dropId };
  });

  await t.mutation(internal.resolve.mergePersons, ids);

  await t.run(async (ctx) => {
    const keep = await ctx.db.get(ids.keepId);
    expect(keep?.role).toBe("lead");
    // keep already had its own company; drop's missing fields don't clobber it.
    expect(keep?.company).toBe("Stripe");
    expect(await ctx.db.get(ids.dropId)).toBeNull();
  });
});
