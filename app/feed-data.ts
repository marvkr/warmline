// Mock feed rows: stand-in until the Convex schema + Fiber ingest land.
// Domain language matches CONTEXT.md: Lead, Warm intro, Gatekeeper, Tie strength, Why, Mutual.

export type Confidence = "high" | "medium" | "low";

export type WhyBullet = {
  text: string;
  confidence: Confidence;
};

export type Mutual = {
  name: string;
  initials: string;
};

export type RowKind = "lead" | "warm-intro";

export type FeedRow = {
  id: string;
  kind: RowKind;
  /** Gatekeeper = a Warm intro that unlocks many Leads. */
  gatekeeper?: boolean;
  name: string;
  initials: string;
  company: string;
  role: string;
  /** Rank against the Goal, 0–100. */
  score: number;
  /** Warmth of the path you'd use, 0–100. */
  tieStrength: number;
  /** How many Leads a Warm intro unlocks (only meaningful for warm-intro rows). */
  unlocks?: number;
  why: WhyBullet[];
  mutuals: Mutual[];
  /** Recommended outreach: channel + angle. Draft only. */
  how: string;
};

export const GOAL = "Warm intro to a growth lead at Stripe";

export const FEED: FeedRow[] = [
  {
    id: "1",
    kind: "lead",
    name: "Dana Whitfield",
    initials: "DW",
    company: "Stripe",
    role: "Head of Growth",
    score: 94,
    tieStrength: 72,
    why: [
      { text: "Owns growth at Stripe, exact role match", confidence: "high" },
      { text: "2 warm intros, both weekly contacts", confidence: "high" },
      { text: "Posted about hiring 3 days ago", confidence: "medium" },
    ],
    mutuals: [
      { name: "Alex Rivera", initials: "AR" },
      { name: "Priya Nair", initials: "PN" },
    ],
    how: "Ask Alex. Angle on his Stripe referral.",
  },
  {
    id: "2",
    kind: "warm-intro",
    gatekeeper: true,
    name: "Alex Rivera",
    initials: "AR",
    company: "Sequoia",
    role: "Partner",
    score: 91,
    tieStrength: 88,
    unlocks: 31,
    why: [
      { text: "Unlocks 31 leads in fintech growth", confidence: "high" },
      { text: "Strongest tie in your network, replies fast", confidence: "high" },
      { text: "Already intro'd you twice this year", confidence: "medium" },
    ],
    mutuals: [
      { name: "Sam Cole", initials: "SC" },
      { name: "Jen Park", initials: "JP" },
      { name: "Omar Diaz", initials: "OD" },
    ],
    how: "DM directly. Skip the formal ask.",
  },
  {
    id: "3",
    kind: "lead",
    name: "Marcus Lindqvist",
    initials: "ML",
    company: "Ramp",
    role: "VP Growth",
    score: 83,
    tieStrength: 41,
    why: [
      { text: "Growth leader at a fintech peer", confidence: "high" },
      { text: "Only one warm path, medium tie", confidence: "medium" },
      { text: "No recent activity signal", confidence: "low" },
    ],
    mutuals: [{ name: "Priya Nair", initials: "PN" }],
    how: "Go through Priya. Reference the Ramp overlap.",
  },
  {
    id: "4",
    kind: "warm-intro",
    name: "Priya Nair",
    initials: "PN",
    company: "Notion",
    role: "Growth PM",
    score: 78,
    tieStrength: 64,
    unlocks: 9,
    why: [
      { text: "Bridges you to 9 leads across Stripe and Ramp", confidence: "high" },
      { text: "Warm tie, consistent DM history", confidence: "medium" },
    ],
    mutuals: [
      { name: "Alex Rivera", initials: "AR" },
      { name: "Dana Whitfield", initials: "DW" },
    ],
    how: "Coffee ask. She likes context first.",
  },
  {
    id: "5",
    kind: "lead",
    name: "Sofia Almeida",
    initials: "SA",
    company: "Stripe",
    role: "Growth Marketing Lead",
    score: 71,
    tieStrength: 28,
    why: [
      { text: "Second growth contact at your target company", confidence: "high" },
      { text: "Weakest tie in this set", confidence: "low" },
    ],
    mutuals: [{ name: "Omar Diaz", initials: "OD" }],
    how: "Low priority. Pursue if Dana stalls.",
  },
];
