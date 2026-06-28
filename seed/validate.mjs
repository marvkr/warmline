// Warmline demo-data validation gate.
//
// Fails LOUDLY (non-zero exit) unless every invariant from PHASE_1 Step 3 holds. This is the
// auto-debug loop's check. Run: `node seed/validate.mjs`. Green (exit 0) = safe to proceed to review.
//
// Note: the raw exports in seed/_inputs/ are gitignored, so "traces to a real export" is verified
// structurally here (valid source + present in the right event/edge) and substantively by the human
// provenance log (seed/WORKLOG.md) + the self-review subagent (seed/REVIEW.md).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(HERE, "demo-data.json"), "utf8");

const checks = [];
const ok = (name) => checks.push({ name, pass: true });
const fail = (name, detail) => checks.push({ name, pass: false, detail });
const assert = (cond, name, detail) => (cond ? ok(name) : fail(name, detail));

let data;
try {
  data = JSON.parse(raw);
  ok("parses as JSON");
} catch (e) {
  fail("parses as JSON", e.message);
  report();
}

const { people = [], edges = [], events = [], recommendations = [], goals = [], flags = {} } = data;
const byId = new Map(people.map((p) => [p.id, p]));
const ALLOWED_SOURCES = new Set(["self", "linkedin_connection", "luma_gala", "luma_convex_hh"]);

// ---- shape ----------------------------------------------------------------
assert(Array.isArray(people) && people.length > 0, "people present", "no people");
assert(Array.isArray(edges) && edges.length > 0, "edges present", "no edges");
assert(Array.isArray(events) && events.length > 0, "events present", "no events");
assert(goals.length >= 1, "goal present", "no goal");

for (const p of people) {
  const reqd = ["id", "name", "is_self", "is_target", "source"];
  const missing = reqd.filter((k) => p[k] === undefined);
  if (missing.length) fail(`person ${p.id || "?"} has required fields`, `missing ${missing}`);
  if (!ALLOWED_SOURCES.has(p.source)) fail(`person ${p.id} source valid`, `bad source ${p.source}`);
}
ok("all people have required fields + valid source");

// referential integrity
for (const e of edges) {
  if (!byId.has(e.from_id)) fail("edge endpoints exist", `missing from_id ${e.from_id}`);
  if (!byId.has(e.to_id)) fail("edge endpoints exist", `missing to_id ${e.to_id}`);
  if (!["linkedin_1st", "co_attended_event"].includes(e.type))
    fail("edge type valid", `${e.type}`);
  if (typeof e.confidence !== "number" || e.confidence < 0 || e.confidence > 1)
    fail("edge confidence in [0,1]", `${e.from_id}->${e.to_id}=${e.confidence}`);
  if (!e.evidence || typeof e.evidence !== "string")
    fail("edge has evidence", `${e.from_id}->${e.to_id}`);
}
ok("edges reference real people, valid type, confidence in [0,1], have evidence");

for (const ev of events)
  for (const a of ev.attendee_ids || [])
    if (!byId.has(a)) fail("event attendees exist", `${ev.id} -> ${a}`);
ok("event attendees exist");

// ---- exactly one self -----------------------------------------------------
const selves = people.filter((p) => p.is_self);
assert(selves.length === 1, "exactly one is_self", `found ${selves.length}`);
const SELF = selves[0]?.id;

// ---- hero path: self -> Han -> >=12 fan-out -------------------------------
const HAN = "han";
const selfHan = edges.find(
  (e) => e.from_id === SELF && e.to_id === HAN && e.type === "linkedin_1st",
);
assert(!!selfHan, "self -> Han linkedin_1st edge exists", "missing");
assert(!!selfHan?.evidence, "self -> Han edge has evidence", "no evidence");

const fanoutEdges = edges.filter(
  (e) => e.from_id === HAN && e.type === "co_attended_event" && !e.judge_kicker,
);
const fanoutTargets = fanoutEdges.map((e) => e.to_id);
assert(
  fanoutTargets.length >= 12,
  "Han -> >=12 fan-out targets",
  `only ${fanoutTargets.length}`,
);
assert(
  fanoutTargets.every((id) => byId.get(id)?.is_target),
  "all fan-out targets flagged is_target",
  "some not flagged",
);
assert(
  fanoutEdges.every((e) => e.evidence && typeof e.confidence === "number"),
  "fan-out edges have evidence + confidence",
  "missing",
);

// node cap: rendered fan-out must not exceed 12
assert(fanoutTargets.length <= 12, "fan-out <= node cap (12)", `${fanoutTargets.length} > 12`);

// ---- confidence is not uniform and not randomized -------------------------
const confs = fanoutEdges.map((e) => e.confidence);
const distinct = new Set(confs);
assert(distinct.size >= 3, "fan-out confidence is non-uniform (>=3 distinct values)", [...distinct].join(","));
const highs = fanoutEdges.filter((e) => e.confidence_tier === "High");
const meds = fanoutEdges.filter((e) => e.confidence_tier === "Medium");
assert(highs.length >= 1 && meds.length >= 1, "both High and Medium tiers present", `High=${highs.length} Med=${meds.length}`);

// determinism: re-derive each fan-out score from its documented features and confirm it matches.
// (rebuild the rule here independently; if generate.mjs ever drifts to randomness this breaks.)
const RELEVANCE = { core: 0.1, adjacent: 0.06, broader: 0.03 };
const REL = {
  justin: { rel: "core", mintlify: true, direct: true }, gabriel: { rel: "broader", direct: true },
  dylan: { rel: "adjacent" }, jeff: { rel: "core" }, albert: { rel: "core" }, ben: { rel: "adjacent" },
  aiden: { rel: "core" }, james: { rel: "core" }, cameron: { rel: "core" }, aron: { rel: "adjacent" },
  jessy: { rel: "broader" }, evan: { rel: "core" },
};
let determinismOk = true;
for (const e of fanoutEdges) {
  const f = REL[e.to_id];
  if (!f) continue;
  let c = 0.45 + (f.direct ? 0.28 : 0) + (f.mintlify ? 0.25 : 0) + (RELEVANCE[f.rel] ?? 0);
  c = Math.min(0.92, Math.round(c * 100) / 100);
  if (Math.abs(c - e.confidence) > 1e-9) {
    determinismOk = false;
    fail("confidence matches documented formula", `${e.to_id}: got ${e.confidence}, formula ${c}`);
  }
}
if (determinismOk) ok("every fan-out confidence reproduces the documented formula (deterministic)");

// ---- judge toggle: dropping judge nodes/edges leaves hero path intact ------
const judgePeople = new Set(people.filter((p) => (p.roles || []).includes("judge")).map((p) => p.id));
assert(judgePeople.size >= 1, "judge people present (kicker)", "none");
assert("include_judge_edges" in flags, "judge toggle flag present", "flags.include_judge_edges missing");
const judgeEdges = edges.filter((e) => e.judge_kicker);
assert(judgeEdges.length >= 2, "judge kicker edges present (Han->Danylo, Purav->Wayne)", `${judgeEdges.length}`);
// simulate toggle OFF
const keptEdges = edges.filter((e) => !e.judge_kicker && !judgePeople.has(e.from_id) && !judgePeople.has(e.to_id));
const heroStillThere =
  keptEdges.some((e) => e.from_id === SELF && e.to_id === HAN) &&
  keptEdges.filter((e) => e.from_id === HAN && e.type === "co_attended_event").length >= 12;
assert(heroStillThere, "hero path survives judge-toggle OFF", "hero path breaks without judge nodes");

// ---- go-cold rec: dormant person + why-now + opener -----------------------
const goCold = recommendations.find((r) => r.type === "go_cold");
assert(!!goCold, "go-cold recommendation exists", "missing");
assert(!!(goCold && (goCold.trigger || (goCold.reason_bullets || []).some((b) => /why now/i.test(b)))),
  "go-cold has a why-now trigger", "no trigger / why-now");
assert(!!goCold?.how?.drafted_opener, "go-cold has a drafted opener", "no opener");

// ---- gatekeeper rec: Han unlocks the fan-out, grounded opener -------------
const gk = recommendations.find((r) => r.type === "gatekeeper" && r.person_id === HAN);
assert(!!gk, "gatekeeper recommendation (Han) exists", "missing");
assert((gk?.unlocks_ids || []).length >= 12, "gatekeeper unlocks >=12 targets", `${gk?.unlocks_ids?.length}`);
assert(!!gk?.how?.drafted_opener && /mintlify/i.test(gk.how.drafted_opener),
  "gatekeeper opener grounded in Han's real activity (mentions Mintlify)", "opener not grounded");

// ---- provenance: hero-path people trace to a real source ------------------
const heroIds = new Set([SELF, HAN, ...fanoutTargets, "purav", ...judgePeople, goCold?.person_id]);
for (const id of heroIds) {
  const p = byId.get(id);
  if (!p) { fail("hero person exists", id); continue; }
  if (!ALLOWED_SOURCES.has(p.source)) fail("hero person traces to real source", `${id}: ${p.source}`);
  if (!p.name) fail("hero person named", id);
}
ok("every hero/judge/go-cold person has a real-export source + name");

// fan-out targets must actually be Gala attendees (structural co-attendance proof)
const gala = events.find((e) => /gala/i.test(e.name));
assert(!!gala, "Mintlify Gala event present", "missing");
const galaSet = new Set(gala?.attendee_ids || []);
assert([HAN, ...fanoutTargets].every((id) => galaSet.has(id)),
  "Han + all fan-out are listed Gala attendees", "a fan-out target is not in the Gala guest list");

// ---- sane counts ----------------------------------------------------------
assert(people.length >= 15 && people.length <= 60, "people count sane (15-60)", `${people.length}`);
assert(edges.length >= 15 && edges.length <= 80, "edges count sane (15-80)", `${edges.length}`);
assert(events.length >= 1 && events.length <= 10, "events count sane (1-10)", `${events.length}`);

// ---- ZERO PII -------------------------------------------------------------
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_FMT = /(\(\d{3}\)\s?\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)/;
const DM_MARKER = /\b(wrote|messaged|texted|DM'?d|said)\s*:/i;
function* strings(node) {
  if (typeof node === "string") yield node;
  else if (Array.isArray(node)) for (const x of node) yield* strings(x);
  else if (node && typeof node === "object") for (const v of Object.values(node)) yield* strings(v);
}
let piiHits = [];
for (const s of strings(data)) {
  if (EMAIL.test(s)) piiHits.push(`email-like: ${s.slice(0, 40)}`);
  if (PHONE_FMT.test(s)) piiHits.push(`phone-like: ${s.slice(0, 40)}`);
  if (DM_MARKER.test(s)) piiHits.push(`dm-like: ${s.slice(0, 40)}`);
  const digitRun = (s.match(/\d{10,}/g) || [])[0]; // 10+ consecutive digits => phone-ish
  if (digitRun) piiHits.push(`long-digit-run: ${digitRun}`);
  if (s.length > 600) piiHits.push(`oversized-string (${s.length} chars) — possible pasted blob`);
}
assert(piiHits.length === 0, "ZERO PII (no emails / phones / DM blobs)", piiHits.join(" | "));

report();

function report() {
  const failed = checks.filter((c) => !c.pass);
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}${c.pass ? "" : "  --> " + c.detail}`);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length) {
    console.error(`\nVALIDATION FAILED: ${failed.length} check(s) failed.`);
    process.exit(1);
  }
  console.log("VALIDATION PASSED.");
  process.exit(0);
}
