"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ThinkingStep,
  ThinkingSteps,
  type StepStatus,
} from "@/components/ui/thinking-steps";

const STEPS = [
  "Reading your product site",
  "Deriving your ICP",
  "Scanning your network",
  "Finding warm paths",
  "Ranking & drafting openers",
];

export default function Onboarding() {
  const router = useRouter();
  const generate = useAction(api.onboard.generate);

  const [website, setWebsite] = useState("https://better-design.com");
  const [linkedin, setLinkedin] = useState(
    "https://linkedin.com/in/marvinkaunda",
  );
  const [x, setX] = useState("https://x.com/kaundamarvin");

  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [icpText, setIcpText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStepAt = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
  }, []);

  async function run() {
    setRunning(true);
    setError(null);
    setStep(0);
    setElapsed(0);
    lastStepAt.current = null;
    timer.current = setInterval(() => {
      setStep((s) => {
        const next = Math.min(s + 1, STEPS.length - 1);
        if (next === STEPS.length - 1 && s !== next) {
          lastStepAt.current = Date.now();
          setElapsed(0);
          elapsedTimer.current = setInterval(
            () => setElapsed((e) => e + 1),
            1000,
          );
        }
        return next;
      });
    }, 3500);
    try {
      const res = await generate({ website, linkedin, x });
      setIcpText(res.icpText);
      setStep(STEPS.length);
      setTimeout(() => router.push("/"), 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setRunning(false);
    } finally {
      if (timer.current) clearInterval(timer.current);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    }
  }

  function statusOf(i: number): StepStatus {
    if (step > i) return "complete";
    if (step === i) return "active";
    return "pending";
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-xl font-semibold tracking-tight">
        Build your warm network
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Three links. We read your product to learn who you sell to, then rank the
        people you already know against it.
      </p>

      {!running ? (
        <div className="mt-7 flex flex-col gap-4">
          <Field label="Product website" value={website} onChange={setWebsite} />
          <Field label="Your LinkedIn" value={linkedin} onChange={setLinkedin} />
          <Field label="Your X" value={x} onChange={setX} />
          <Button onClick={run} className="mt-2">
            Build my network
          </Button>
          {error ? (
            <p className="text-sm text-destructive-foreground">{error}</p>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-border bg-card p-5 [box-shadow:var(--shadow-s)]">
          <ThinkingSteps>
            {STEPS.map((title, i) => (
              <ThinkingStep
                key={title}
                title={title}
                status={statusOf(i)}
                showConnector={i < STEPS.length - 1}
                description={
                  i === 1 && icpText && step > 1
                    ? icpText
                    : i === STEPS.length - 1 && step === STEPS.length - 1
                      ? elapsed < 5
                        ? "Scoring your network against your ICP…"
                        : `Still working — embedding takes ~1–2 min (${elapsed}s)`
                      : undefined
                }
              />
            ))}
          </ThinkingSteps>
          {step >= STEPS.length ? (
            <p className="mt-3 text-sm font-medium text-foreground">
              Done — opening your feed…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
