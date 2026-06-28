import { expect, test } from "vitest";
import {
  cosine,
  initials,
  confLabel,
  reachability,
  introScore,
  feedScore,
  normCompany,
} from "./lib";

test("cosine: identical vectors = 1, orthogonal = 0", () => {
  expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
  expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  expect(cosine([1, 2, 3], [2, 4, 6])).toBeCloseTo(1); // colinear
});

test("cosine: zero vector is safe", () => {
  expect(cosine([0, 0], [1, 1])).toBe(0);
  expect(cosine([], [])).toBe(0);
});

test("initials: first two words, uppercase", () => {
  expect(initials("Marvin Kaunda")).toBe("MK");
  expect(initials("han")).toBe("H");
  expect(initials("a b c d")).toBe("AB");
  expect(initials("")).toBe("");
});

test("confLabel: thresholds", () => {
  expect(confLabel(0.9)).toBe("high");
  expect(confLabel(0.5)).toBe("medium");
  expect(confLabel(0.1)).toBe("low");
});

test("reachability: connected + tie beats cold", () => {
  const connected = reachability("connected", 1);
  const cold = reachability("not_connected", undefined);
  expect(connected).toBeGreaterThan(cold);
  expect(connected).toBeLessThanOrEqual(1);
  expect(cold).toBeCloseTo(0.1);
});

test("introScore: tie × confidence; zero tie kills it", () => {
  expect(introScore(0.8, 0.5)).toBeCloseTo(0.4);
  expect(introScore(0, 1)).toBe(0);
  expect(introScore(undefined, 0.9)).toBe(0);
});

test("feedScore: 0–100, weights goal-fit + reachability", () => {
  expect(feedScore(1, 1)).toBe(100);
  expect(feedScore(0, 0)).toBe(0);
  expect(feedScore(1, 0)).toBe(55);
});

test("normCompany: trims, empties → undefined", () => {
  expect(normCompany("  Stripe ")).toBe("Stripe");
  expect(normCompany("")).toBeUndefined();
  expect(normCompany(undefined)).toBeUndefined();
});
