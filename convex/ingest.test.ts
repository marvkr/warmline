/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

// ── ingestConnections ──

test("ingestConnections: inserts a 1st-degree connector with the right defaults", async () => {
  const t = convexTest(schema, modules);
  const r = await t.mutation(api.ingest.ingestConnections, {
    rows: [
      {
        name: "Han Wang",
        linkedinUrl: "hanwang",
        headline: "Founder",
        company: "Mintlify",
        tieStrength: 0.8,
      },
    ],
  });
  expect(r).toEqual({ inserted: 1, patched: 0 });

  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1);
  const p = people[0];
  expect(p.name).toBe("Han Wang");
  expect(p.role).toBe("connector");
  expect(p.relationshipToYou).toBe("connected");
  expect(p.isSelf).toBe(false);
  expect(p.company).toBe("Mintlify");
  expect(p.tieStrength).toBe(0.8);
});

test("ingestConnections: dedups by linkedin slug (no duplicate persons)", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.ingest.ingestConnections, {
    rows: [{ name: "Han Wang", linkedinUrl: "hanwang", company: "Mintlify" }],
  });
  const r2 = await t.mutation(api.ingest.ingestConnections, {
    rows: [{ name: "Han Wang", linkedinUrl: "hanwang", company: "Mintlify" }],
  });
  expect(r2).toEqual({ inserted: 0, patched: 1 });

  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1);
});

test("ingestConnections: fills missing fields on re-ingest but never clobbers existing", async () => {
  const t = convexTest(schema, modules);
  // First pass: only name + slug, no headline/company yet.
  await t.mutation(api.ingest.ingestConnections, {
    rows: [{ name: "Han Wang", linkedinUrl: "hanwang", company: "Mintlify" }],
  });
  // Second pass: fills the empty headline, but must NOT overwrite the existing company.
  const r = await t.mutation(api.ingest.ingestConnections, {
    rows: [
      {
        name: "Han Wang",
        linkedinUrl: "hanwang",
        headline: "Founder @ Mintlify",
        company: "OpenAI", // different — should be ignored, company already set
      },
    ],
  });
  expect(r).toEqual({ inserted: 0, patched: 1 });

  const p = await t.run(async (ctx) =>
    ctx.db
      .query("persons")
      .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", "hanwang"))
      .first(),
  );
  expect(p?.headline).toBe("Founder @ Mintlify"); // filled (was missing)
  expect(p?.company).toBe("Mintlify"); // preserved (not clobbered)
});

test("ingestConnections: tieStrength is applied on insert and updated on re-ingest", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.ingest.ingestConnections, {
    rows: [{ name: "Han Wang", linkedinUrl: "hanwang", tieStrength: 0.2 }],
  });
  let p = await t.run(async (ctx) =>
    ctx.db
      .query("persons")
      .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", "hanwang"))
      .first(),
  );
  expect(p?.tieStrength).toBe(0.2);

  // Re-ingest with a refreshed tie strength — this field is allowed to update.
  await t.mutation(api.ingest.ingestConnections, {
    rows: [{ name: "Han Wang", linkedinUrl: "hanwang", tieStrength: 0.9 }],
  });
  p = await t.run(async (ctx) =>
    ctx.db
      .query("persons")
      .withIndex("by_linkedinUrl", (q) => q.eq("linkedinUrl", "hanwang"))
      .first(),
  );
  expect(p?.tieStrength).toBe(0.9);
});

// ── ingestSelf ──

test("ingestSelf: sets isSelf with connector/connected defaults", async () => {
  const t = convexTest(schema, modules);
  const id = await t.mutation(api.ingest.ingestSelf, {
    name: "Marvin Kaunda",
    linkedinUrl: "marvin",
  });
  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1);
  const me = people[0];
  expect(me._id).toBe(id);
  expect(me.isSelf).toBe(true);
  expect(me.role).toBe("connector");
  expect(me.relationshipToYou).toBe("connected");
});

test("ingestSelf: dedups by slug and returns the same person id", async () => {
  const t = convexTest(schema, modules);
  const id1 = await t.mutation(api.ingest.ingestSelf, {
    name: "Marvin Kaunda",
    linkedinUrl: "marvin",
  });
  const id2 = await t.mutation(api.ingest.ingestSelf, {
    name: "Marvin Kaunda",
    linkedinUrl: "marvin",
  });
  expect(id2).toBe(id1);
  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1);
});

test("ingestSelf: flags an existing connection as self without duplicating", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.ingest.ingestConnections, {
    rows: [{ name: "Marvin Kaunda", linkedinUrl: "marvin", company: "Warmline" }],
  });
  const id = await t.mutation(api.ingest.ingestSelf, {
    name: "Marvin Kaunda",
    linkedinUrl: "marvin",
  });
  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1);
  const me = people[0];
  expect(me._id).toBe(id);
  expect(me.isSelf).toBe(true);
  expect(me.company).toBe("Warmline"); // existing data untouched
});

// ── ingestLeads ──

test("ingestLeads: inserts a fresh lead as role lead / not_connected and builds event + attendance", async () => {
  const t = convexTest(schema, modules);
  const r = await t.mutation(api.ingest.ingestLeads, {
    rows: [
      {
        name: "Patrick Collison",
        linkedinUrl: "pcollison",
        eventName: "AI Summit",
        eventDate: 1234567890,
        confidence: 0.7,
      },
    ],
  });
  expect(r).toEqual({ leads: 1, attendances: 1 });

  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1);
  const lead = people[0];
  expect(lead.role).toBe("lead");
  expect(lead.relationshipToYou).toBe("not_connected");
  expect(lead.isSelf).toBe(false);

  const events = await t.run(async (ctx) => ctx.db.query("events").collect());
  expect(events).toHaveLength(1);
  expect(events[0].name).toBe("AI Summit");
  expect(events[0].date).toBe(1234567890);

  const att = await t.run(async (ctx) => ctx.db.query("attendance").collect());
  expect(att).toHaveLength(1);
  expect(att[0].personId).toBe(lead._id);
  expect(att[0].eventId).toBe(events[0]._id);
  expect(att[0].confidence).toBe(0.7);
});

test("ingestLeads: defaults attendance-confidence to 1 and skips attendance when no event", async () => {
  const t = convexTest(schema, modules);
  const r = await t.mutation(api.ingest.ingestLeads, {
    rows: [
      { name: "Has Event", linkedinUrl: "hasevent", eventName: "Demo Day" }, // no confidence
      { name: "No Event", linkedinUrl: "noevent" }, // no event at all
    ],
  });
  expect(r).toEqual({ leads: 2, attendances: 1 });

  const att = await t.run(async (ctx) => ctx.db.query("attendance").collect());
  expect(att).toHaveLength(1);
  expect(att[0].confidence).toBe(1); // default
});

test("ingestLeads: overlap case — promotes an existing connection to lead, keeps it connected", async () => {
  const t = convexTest(schema, modules);
  // She's already a 1st-degree connection with real warmth + profile data.
  await t.mutation(api.ingest.ingestConnections, {
    rows: [
      {
        name: "Dolly Singh",
        linkedinUrl: "dolly",
        company: "Acme",
        tieStrength: 0.8,
      },
    ],
  });
  // Same slug shows up in the Leads config → promote, don't duplicate.
  const r = await t.mutation(api.ingest.ingestLeads, {
    rows: [{ name: "Dolly Singh", linkedinUrl: "dolly", eventName: "AI Summit" }],
  });
  expect(r).toEqual({ leads: 1, attendances: 1 });

  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  expect(people).toHaveLength(1); // not duplicated
  const dolly = people[0];
  expect(dolly.role).toBe("lead"); // promoted
  expect(dolly.relationshipToYou).toBe("connected"); // kept — this is the overlap value
  expect(dolly.tieStrength).toBe(0.8); // warmth preserved
  expect(dolly.company).toBe("Acme"); // profile preserved
});

test("ingestLeads: dedups attendance for the same person + event across calls", async () => {
  const t = convexTest(schema, modules);
  const row = {
    name: "Patrick Collison",
    linkedinUrl: "pcollison",
    eventName: "AI Summit",
  };
  const r1 = await t.mutation(api.ingest.ingestLeads, { rows: [row] });
  expect(r1).toEqual({ leads: 1, attendances: 1 });

  // Re-ingest the same person at the same event — person + event + attendance all dedup.
  const r2 = await t.mutation(api.ingest.ingestLeads, { rows: [row] });
  expect(r2).toEqual({ leads: 1, attendances: 0 });

  const people = await t.run(async (ctx) => ctx.db.query("persons").collect());
  const events = await t.run(async (ctx) => ctx.db.query("events").collect());
  const att = await t.run(async (ctx) => ctx.db.query("attendance").collect());
  expect(people).toHaveLength(1);
  expect(events).toHaveLength(1);
  expect(att).toHaveLength(1);
});

test("ingestLeads: dedups attendance within a single call (duplicate rows)", async () => {
  const t = convexTest(schema, modules);
  const row = {
    name: "Patrick Collison",
    linkedinUrl: "pcollison",
    eventName: "AI Summit",
  };
  const r = await t.mutation(api.ingest.ingestLeads, { rows: [row, row] });
  expect(r).toEqual({ leads: 2, attendances: 1 });

  const att = await t.run(async (ctx) => ctx.db.query("attendance").collect());
  expect(att).toHaveLength(1);
});
