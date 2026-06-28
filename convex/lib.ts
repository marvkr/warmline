// Pure helpers — no Convex registration, safe to unit-test directly.

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function confLabel(x: number): "high" | "medium" | "low" {
  return x >= 0.66 ? "high" : x >= 0.33 ? "medium" : "low";
}

// Reachability proxy: known + talked-to ranks high. tie ∈ [0,1].
export function reachability(
  relationship: "connected" | "not_connected",
  tieStrength: number | undefined,
): number {
  const tie = tieStrength ?? 0;
  const base = relationship === "connected" ? 0.4 : 0.1;
  return Math.min(1, base + tie * 0.6);
}

// intro_score = your tie to the connector × how well they know the lead.
export function introScore(
  connectorTie: number | undefined,
  edgeConfidence: number,
): number {
  return (connectorTie ?? 0.0) * edgeConfidence;
}

// Blend goal-fit and reachability into a 0–100 feed score.
export function feedScore(goalFit: number, reach: number): number {
  return Math.round(100 * (0.55 * goalFit + 0.45 * reach));
}

export function normCompany(c?: string): string | undefined {
  const t = (c ?? "").trim();
  return t.length ? t : undefined;
}
