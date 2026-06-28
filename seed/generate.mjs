// Warmline demo-data generator.
//
// Emits seed/demo-data.json from a hand-verified roster. Every person here traces to a real export
// (LinkedIn Connections.csv or the Luma guest-list PDF) — see seed/WORKLOG.md for line-level
// provenance. The confidence rule lives in scoreReachability() below so it is auditable and provably
// deterministic (never randomized). Run: `node seed/generate.mjs`.
//
// HARD RULES honored here:
//  - No PII: only public name / role / company / public LinkedIn URL / public X handle / attendance.
//  - Confidence is computed by an explainable formula, identical every run.
//  - Judge edges (Han->Danylo, Purav->Wayne) carry judge_kicker:true so they can be toggled off.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "demo-data.json");

const GOAL_ID = "goal_sf_devtools";
const GALA = { id: "evt_mintlify_gala", name: "Mintlify Gala", date: "2026-04-16" };
const CONVEX_HH = {
  id: "evt_convex_happy_hour",
  name: "Convex and Friends Happy Hour @ Thee Parkside",
  date: "2026-06-18",
};

// ----------------------------------------------------------------------------
// Roster. `rel` = goal-relevance bucket (public role vs "Break into SF dev tools").
// `connectedOn` present => also a real 1st-degree LinkedIn connection (self -> them).
// ----------------------------------------------------------------------------
const SELF = {
  id: "self",
  name: "Zach Speck",
  headline: "Breaking into SF dev tools",
  company: null,
  linkedin_url: null,
  x_handle: null,
  roles: ["self"],
  source: "self",
};

const HAN = {
  id: "han",
  name: "Han Wang",
  headline: "Co-Founder, Mintlify",
  company: "Mintlify",
  linkedin_url: "https://linkedin.com/in/handotdev",
  x_handle: "handotdev",
  roles: ["gatekeeper"],
  source: "linkedin_connection",
  connectedOn: "2025-08-16",
};

// The 12 rendered fan-out targets (is_target). `mintlify` => shares Han's employer.
const FANOUT = [
  { id: "justin", name: "Justin Torre", headline: "Head of Enterprise, Mintlify", company: "Mintlify",
    linkedin_url: "https://linkedin.com/in/justintorre", x_handle: "justinstorre",
    rel: "core", mintlify: true, connectedOn: "2025-01-23" },
  { id: "gabriel", name: "Gabriel Petersson", headline: "Research (Sora), OpenAI", company: "OpenAI",
    linkedin_url: "https://linkedin.com/in/gabriel-petersson-ai", x_handle: "GabrielPeterss4",
    rel: "broader", connectedOn: "2024-12-05" },
  { id: "dylan", name: "Dylan Patel", headline: "Founder, SemiAnalysis", company: "SemiAnalysis",
    linkedin_url: "https://linkedin.com/in/dylanpatelsa", x_handle: "dylan522p", rel: "adjacent" },
  { id: "jeff", name: "Jeff Huber", headline: "Founder, Chroma", company: "Chroma",
    linkedin_url: "https://linkedin.com/in/jeffchuber", x_handle: "jeffreyhuber", rel: "core" },
  { id: "albert", name: "Albert Gu", headline: "Co-Founder, Cartesia (Mamba)", company: "Cartesia",
    linkedin_url: "https://linkedin.com/in/albert-gu-8ab677139", x_handle: "_albertgu", rel: "core" },
  { id: "ben", name: "Ben Tossell", headline: "Founder, Ben's Bites", company: "Ben's Bites",
    linkedin_url: null, x_handle: "bentossell", rel: "adjacent" },
  { id: "aiden", name: "Aiden Bai", headline: "Creator, React Scan / Million.js", company: "React Scan",
    linkedin_url: "https://linkedin.com/in/aidenbai", x_handle: "aidenybai", rel: "core" },
  { id: "james", name: "James Grugett", headline: "Co-Founder, Manifold", company: "Manifold",
    linkedin_url: "https://linkedin.com/in/james-grugett", x_handle: "jahooma", rel: "core" },
  { id: "cameron", name: "Cameron Pfiffer", headline: "Dev / Community, Letta", company: "Letta",
    linkedin_url: "https://linkedin.com/in/cameron-pfiffer", x_handle: "just_cameron", rel: "core" },
  { id: "aron", name: "Aron Korenblit", headline: "Automation educator", company: "Independent",
    linkedin_url: "https://linkedin.com/in/aronkor", x_handle: "aronkor", rel: "adjacent" },
  { id: "jessy", name: "Jessy Lin", headline: "AI Researcher, UC Berkeley", company: "UC Berkeley",
    linkedin_url: "https://linkedin.com/in/jessylin", x_handle: "realJessyLin", rel: "broader" },
  { id: "evan", name: "Evan Bacon", headline: "Expo (React Native)", company: "Expo",
    linkedin_url: "https://linkedin.com/in/evanbacon", x_handle: "baconbrix", rel: "core" },
];

// Judge kicker (optional, toggleable). Purav is a real connection; the kicker edges are Han->Danylo
// and Purav->Wayne.
const PURAV = { id: "purav", name: "Purav Patel", headline: "Co-Founder, Clayzo", company: "Clayzo",
  linkedin_url: "https://linkedin.com/in/puravp05", x_handle: "patelpurav05",
  roles: ["judge_bridge"], source: "linkedin_connection", connectedOn: "2026-06-23" };
const WAYNE = { id: "wayne", name: "Wayne Sutton", headline: "Convex (hackathon judge)", company: "Convex",
  linkedin_url: "https://linkedin.com/in/waynesutton", x_handle: "waynesutton",
  roles: ["judge"], source: "luma_convex_hh", rel: "core" };
const DANYLO = { id: "danylo", name: "Danylo Borodchuk", headline: "Lopus (hackathon judge)", company: "Lopus",
  linkedin_url: "https://linkedin.com/in/danylo-borodchuk", x_handle: "danylo_dev",
  roles: ["judge"], source: "luma_gala", rel: "broader" };

// Go-cold: real dormant connection.
const CRISTINA = { id: "cristina", name: "Cristina Cordova", headline: "COO, Linear", company: "Linear",
  linkedin_url: "https://linkedin.com/in/cristinajcordova", x_handle: null,
  roles: ["go_cold"], source: "linkedin_connection", connectedOn: "2021-02-21" };

// Supporting cast — real 1st-degree connections at dev-tools companies; graph body + "150 reachable".
const SUPPORT = [
  { id: "raouf", name: "Raouf Chebri", headline: "Developer Relations, Replit", company: "Replit",
    linkedin_url: "https://linkedin.com/in/raoufchebri", x_handle: null, connectedOn: "2024-10-14" },
  { id: "pontus", name: "Pontus Abrahamsson", headline: "Principal Engineer, Ramp", company: "Ramp",
    linkedin_url: "https://linkedin.com/in/pontusabrahamsson", x_handle: null, connectedOn: "2025-04-10" },
  { id: "greg", name: "Greg Feingold", headline: "Special Projects, Anthropic", company: "Anthropic",
    linkedin_url: "https://linkedin.com/in/greg-feingold-3a890a91", x_handle: null, connectedOn: "2025-06-12" },
  { id: "kristiyan", name: "Kristiyan Velkov", headline: "Cursor Ambassador", company: "Cursor",
    linkedin_url: "https://linkedin.com/in/kristiyanvelkov", x_handle: null, connectedOn: "2026-06-10" },
  { id: "allis", name: "Allis Yao", headline: "Member of Technical Staff, OpenAI", company: "OpenAI",
    linkedin_url: "https://linkedin.com/in/allisyao", x_handle: null, connectedOn: "2025-07-10" },
];

// ----------------------------------------------------------------------------
// Confidence model — explainable, deterministic, NEVER randomized. (Mirrors SCHEMA.md.)
// ----------------------------------------------------------------------------
const RELEVANCE = { core: 0.1, adjacent: 0.06, broader: 0.03 };

function scoreReachability({ rel, mintlify = false, directConnection = false }) {
  let c = 0.45; // verified co-attendance with the gatekeeper
  if (directConnection) c += 0.28; // independent warm path (already a 1st-degree connection)
  if (mintlify) c += 0.25; // gatekeeper can intro internally at his own company
  c += RELEVANCE[rel] ?? 0;
  c = Math.min(c, 0.92); // never imply certainty about a private relationship
  return Math.round(c * 100) / 100;
}
const tierOf = (c) => (c >= 0.7 ? "High" : "Medium");

// ----------------------------------------------------------------------------
// Build
// ----------------------------------------------------------------------------
const people = [];
const edges = [];

const pushPerson = (p, extra = {}) =>
  people.push({
    id: p.id,
    name: p.name,
    headline: p.headline ?? null,
    company: p.company ?? null,
    linkedin_url: p.linkedin_url ?? null,
    x_handle: p.x_handle ?? null,
    avatar_url: null,
    is_self: !!extra.is_self,
    is_target: !!extra.is_target,
    roles: p.roles ?? extra.roles ?? [],
    source: p.source,
  });

// self + gatekeeper
pushPerson(SELF, { is_self: true });
pushPerson(HAN);
edges.push({
  from_id: "self", to_id: "han", type: "linkedin_1st", confidence: 0.95,
  evidence: `LinkedIn 1st-degree connection since ${HAN.connectedOn}`,
  confidence_tier: null, confidence_generated: false, judge_kicker: false, event_id: null,
});

// fan-out (12 targets), each with a co_attended_event edge from Han + (if a connection) a self edge
for (const t of FANOUT) {
  pushPerson({ ...t, roles: ["fanout"], source: "luma_gala" }, { is_target: true });
  const directConnection = !!t.connectedOn;
  const c = scoreReachability({ rel: t.rel, mintlify: !!t.mintlify, directConnection });
  edges.push({
    from_id: "han", to_id: t.id, type: "co_attended_event", confidence: c,
    evidence: `Both attended ${GALA.name}, ${GALA.date}`,
    confidence_tier: tierOf(c), confidence_generated: true, judge_kicker: false, event_id: GALA.id,
  });
  if (directConnection) {
    edges.push({
      from_id: "self", to_id: t.id, type: "linkedin_1st", confidence: 0.95,
      evidence: `LinkedIn 1st-degree connection since ${t.connectedOn}`,
      confidence_tier: null, confidence_generated: false, judge_kicker: false, event_id: null,
    });
  }
}

// judge kicker: self->Purav (real connection), Purav->Wayne (co-attended Convex HH); Han->Danylo (Gala)
pushPerson(PURAV);
pushPerson(WAYNE);
pushPerson(DANYLO);
edges.push({
  from_id: "self", to_id: "purav", type: "linkedin_1st", confidence: 0.95,
  evidence: `LinkedIn 1st-degree connection since ${PURAV.connectedOn}`,
  confidence_tier: null, confidence_generated: false, judge_kicker: false, event_id: null,
});
{
  const c = scoreReachability({ rel: WAYNE.rel });
  edges.push({
    from_id: "purav", to_id: "wayne", type: "co_attended_event", confidence: c,
    evidence: `Both attended ${CONVEX_HH.name}, ${CONVEX_HH.date}`,
    confidence_tier: tierOf(c), confidence_generated: true, judge_kicker: true, event_id: CONVEX_HH.id,
  });
}
{
  const c = scoreReachability({ rel: DANYLO.rel });
  edges.push({
    from_id: "han", to_id: "danylo", type: "co_attended_event", confidence: c,
    evidence: `Both attended ${GALA.name}, ${GALA.date}`,
    confidence_tier: tierOf(c), confidence_generated: true, judge_kicker: true, event_id: GALA.id,
  });
}

// go-cold + supporting cast (self 1st-degree connections, graph body)
pushPerson(CRISTINA);
edges.push({
  from_id: "self", to_id: "cristina", type: "linkedin_1st", confidence: 0.95,
  evidence: `LinkedIn 1st-degree connection since ${CRISTINA.connectedOn}`,
  confidence_tier: null, confidence_generated: false, judge_kicker: false, event_id: null,
});
for (const s of SUPPORT) {
  pushPerson({ ...s, roles: ["support"], source: "linkedin_connection" });
  edges.push({
    from_id: "self", to_id: s.id, type: "linkedin_1st", confidence: 0.95,
    evidence: `LinkedIn 1st-degree connection since ${s.connectedOn}`,
    confidence_tier: null, confidence_generated: false, judge_kicker: false, event_id: null,
  });
}

// events
const events = [
  { ...GALA, attendee_ids: ["han", ...FANOUT.map((t) => t.id), "danylo"] },
  { ...CONVEX_HH, attendee_ids: ["purav", "wayne"] },
];

// goal
const goals = [{ id: GOAL_ID, text: "Break into SF dev tools", goal_vector: null }];

// recommendations
const fanoutIds = FANOUT.map((t) => t.id);
const recommendations = [
  {
    id: "rec_gatekeeper_han",
    type: "gatekeeper",
    person_id: "han",
    goal_id: GOAL_ID,
    score: 0.95,
    reason_bullets: [
      "Your 1st-degree LinkedIn connection since 2025-08-16 — a warm door, not a cold email.",
      "Co-founder of Mintlify, an AI-docs dev-tools company squarely in your target space.",
      "Stood in the room at the Mintlify Gala with 12 of your highest-value targets (Dylan Patel, Jeff Huber, Albert Gu, Aiden Bai, Cameron Pfiffer…).",
      "One coffee with Han is a credible intro path to a whole SF dev-tools cohort — 1 gatekeeper, a room.",
    ],
    trigger: null,
    trigger_generated: false,
    how: {
      channel: "Warm DM on X (@handotdev), then a 20-min coffee",
      angle: "Peer building in dev tools — lead with Mintlify's docs-for-AI work and the Gala crowd, ask for 2–3 specific intros, not a blanket favor.",
      drafted_opener:
        "Han — fellow dev-tools obsessive here, we connected on LinkedIn last year. Loved the crowd at the Mintlify Gala — that's exactly the SF dev-tools room I'm trying to build into. Could I grab 20 min of coffee? I'd specifically love a warm intro to Jeff (Chroma) and Albert (Cartesia) if you think there's a fit.",
    },
    how_generated: true,
    unlocks_ids: fanoutIds,
  },
  {
    id: "rec_go_cold_cristina",
    type: "go_cold",
    person_id: "cristina",
    goal_id: GOAL_ID,
    score: 0.72,
    reason_bullets: [
      "Real 1st-degree connection since 2021-02-21 — dormant 5+ years, worth reviving.",
      "COO of Linear — a flagship SF dev-tools company and a direct line into that world.",
      "Why now: a dormant but high-value, goal-relevant tie — Linear is the bar in the SF dev-tools world you're breaking into.",
    ],
    trigger: "Dormant 5+ years — resurfaced as a high-relevance reconnect for your \"SF dev tools\" goal.",
    trigger_generated: true,
    how: {
      channel: "LinkedIn re-intro message",
      angle: "Reconnect warmly, acknowledge the gap, anchor on a shared dev-tools thread, no ask on the first touch.",
      drafted_opener:
        "Cristina — it's been far too long since we first connected. I've been going deep on SF dev tools lately and Linear keeps coming up as the bar everyone measures against. Would love to reconnect and hear how you're thinking about the space — no agenda, just genuinely want to catch up.",
    },
    how_generated: true,
    unlocks_ids: [],
  },
];

const data = {
  _meta: {
    project: "Warmline demo dataset",
    generated_by: "seed/generate.mjs",
    goal: "Break into SF dev tools",
    node_cap: 12,
    fanout_count: FANOUT.length,
    provenance:
      "People trace to real LinkedIn connections + Luma guest lists (seed/_inputs/, gitignored). " +
      "See seed/WORKLOG.md for line-level provenance and seed/SCHEMA.md for the confidence method.",
    claims: {
      real: "people, evidence strings, events + attendance, co-attendance bridges",
      model_generated: "co_attended_event confidence scores + live reranking",
      illustrative: "specific confidence values, drafted openers, angles, go-cold trigger",
      not_live: "burner Luma signup, auto-send, per-user learning over time",
    },
    pii: "none — no emails / phones / DMs / logins; public fields only",
  },
  flags: {
    // The clearly-named judge toggle. Render with this false => drop role:'judge' people and
    // judge_kicker:true edges; hero path + 12 fan-out stay intact.
    include_judge_edges: true,
  },
  goals,
  people,
  events,
  edges,
  recommendations,
};

writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(
  `Wrote ${OUT}\n  people=${people.length} edges=${edges.length} events=${events.length} ` +
    `recs=${recommendations.length} fanout=${FANOUT.length}`,
);
