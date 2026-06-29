"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ThinkingStep,
  ThinkingSteps,
  type StepStatus,
} from "@/components/ui/thinking-steps";
import {
  CheckIcon,
  UploadIcon,
  DownloadIcon,
  FileTextIcon,
} from "@/components/icons";
import { ChromeIcon, LinkedinIcon } from "@/components/icons/brand";
import { cn } from "@/lib/utils";
import { WarmlineMark } from "@/components/warmline-mark";

const PROCESSING_STEPS = [
  "Reading your product site",
  "Deriving your ICP",
  "Scanning your network",
  "Finding warm paths",
  "Ranking & drafting openers",
];

export default function Onboarding() {
  const router = useRouter();
  const generate = useAction(api.onboard.generate);
  const generateUploadUrl = useMutation(api.connectors.generateUploadUrl);
  const recordUpload = useMutation(api.connectors.recordUpload);
  const parseLinkedIn = useAction(api.linkedinImport.parseLinkedInExport);

  const [phase, setPhase] = useState<"product" | "connect" | "processing">("product");
  const [website, setWebsite] = useState("");
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [linkedinGuideOpen, setLinkedinGuideOpen] = useState(false);

  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [processError, setProcessError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
  }, []);

  async function handleLinkedInFile(file: File) {
    try {
      setUploadBusy(true);
      setUploadError(null);
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await recordUpload({
        provider: "linkedin",
        method: "manual",
        label: "LinkedIn connections",
        fileName: file.name,
        storageId,
      });
      await parseLinkedIn({ storageId });
      setLinkedinConnected(true);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  async function markExtensionInstalled() {
    await recordUpload({
      provider: "extension",
      method: "extension",
      label: "Chrome extension",
    });
    setExtensionConnected(true);
  }

  async function startProcessing() {
    setPhase("processing");
    setStep(0);
    setElapsed(0);
    timer.current = setInterval(() => {
      setStep((s) => {
        const next = Math.min(s + 1, PROCESSING_STEPS.length - 1);
        if (next === PROCESSING_STEPS.length - 1 && s !== next) {
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
      await generate({ website: website || undefined });
      setStep(PROCESSING_STEPS.length);
      setTimeout(() => router.push("/"), 1400);
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("connect");
    } finally {
      if (timer.current) clearInterval(timer.current);
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    }
  }

  function stepStatus(i: number): StepStatus {
    if (step > i) return "complete";
    if (step === i) return "active";
    return "pending";
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2.5">
          <WarmlineMark className="size-7 shrink-0" />
          <span className="text-base font-semibold tracking-tight">Warmline</span>
        </div>

        {phase === "product" && (
          <ProductStep
            website={website}
            onWebsite={setWebsite}
            onNext={() => setPhase("connect")}
          />
        )}

        {phase === "connect" && (
          <ConnectStep
            linkedinConnected={linkedinConnected}
            extensionConnected={extensionConnected}
            uploadBusy={uploadBusy}
            uploadError={uploadError}
            linkedinGuideOpen={linkedinGuideOpen}
            onToggleGuide={() => setLinkedinGuideOpen((o) => !o)}
            onLinkedInFile={handleLinkedInFile}
            onMarkExtension={markExtensionInstalled}
            onBuild={startProcessing}
            error={processError}
          />
        )}

        {phase === "processing" && (
          <div className="rounded-xl border border-border bg-card p-5 [box-shadow:var(--shadow-s)]">
            <p className="mb-4 text-sm font-medium text-foreground">
              Building your warm network…
            </p>
            <ThinkingSteps>
              {PROCESSING_STEPS.map((title, i) => (
                <ThinkingStep
                  key={title}
                  title={title}
                  status={stepStatus(i)}
                  showConnector={i < PROCESSING_STEPS.length - 1}
                  description={
                    i === PROCESSING_STEPS.length - 1 &&
                    step === PROCESSING_STEPS.length - 1
                      ? elapsed < 5
                        ? "Scoring your network against your ICP…"
                        : `Still working — embedding takes ~1–2 min (${elapsed}s)`
                      : undefined
                  }
                />
              ))}
            </ThinkingSteps>
            {step >= PROCESSING_STEPS.length ? (
              <p className="mt-3 text-sm font-medium text-foreground">
                Done — opening your feed…
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductStep({
  website,
  onWebsite,
  onNext,
}: {
  website: string;
  onWebsite: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">What do you sell?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We read your product site to learn who you&apos;re selling to.
      </p>
      <div className="mt-7 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Product website</Label>
          <Input
            type="url"
            placeholder="https://your-product.com"
            value={website}
            onChange={(e) => onWebsite(e.target.value)}
            autoFocus
          />
        </div>
        <Button
          onClick={onNext}
          disabled={!website.trim()}
          className="mt-1"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

function ConnectStep({
  linkedinConnected,
  extensionConnected,
  uploadBusy,
  uploadError,
  linkedinGuideOpen,
  onToggleGuide,
  onLinkedInFile,
  onMarkExtension,
  onBuild,
  error,
}: {
  linkedinConnected: boolean;
  extensionConnected: boolean;
  uploadBusy: boolean;
  uploadError: string | null;
  linkedinGuideOpen: boolean;
  onToggleGuide: () => void;
  onLinkedInFile: (f: File) => void;
  onMarkExtension: () => void;
  onBuild: () => void;
  error: string | null;
}) {
  const connectedCount = [linkedinConnected, extensionConnected].filter(Boolean).length;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Connect your network</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        The more contacts you add, the warmer your paths.
      </p>

      <div className="mt-7 flex flex-col gap-3">
        {/* LinkedIn */}
        <SourceCard
          Icon={LinkedinIcon}
          name="LinkedIn"
          blurb="Import your connections from a LinkedIn data export."
          connected={linkedinConnected}
        >
          {!linkedinConnected && (
            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={onToggleGuide}
                aria-expanded={linkedinGuideOpen}
                className="flex items-center gap-2 text-left text-sm text-muted-foreground hover:text-foreground"
              >
                <FileTextIcon className="size-4 shrink-0 text-primary" aria-hidden />
                <span>How to export your LinkedIn data</span>
              </button>

              {linkedinGuideOpen && (
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-3">
                  <ol className="flex flex-col gap-2">
                    {[
                      { text: "Go to LinkedIn → Settings → Data Privacy → Get a copy of your data", warn: undefined },
                      { text: "Select Download larger data archive (top option).", warn: "The second option won't include your connections." },
                      { text: "Click Request archive. LinkedIn emails it in ~10 minutes." },
                    ].map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-secondary-foreground">
                        <span className="flex size-4 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span>
                          {s.text}
                          {s.warn && (
                            <span className="mt-0.5 block text-[oklch(0.78_0.14_22)]">{s.warn}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a
                      href="https://www.linkedin.com/mypreferences/d/download-my-data"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open LinkedIn export
                      <DownloadIcon className="size-3.5" aria-hidden />
                    </a>
                  </Button>
                </div>
              )}

              <LinkedInDropzone busy={uploadBusy} onFile={onLinkedInFile} />
              {uploadError && (
                <p className="text-xs text-destructive-foreground">{uploadError}</p>
              )}
            </div>
          )}
        </SourceCard>

        {/* Chrome Extension */}
        <SourceCard
          Icon={ChromeIcon}
          name="Chrome Extension"
          blurb="Capture LinkedIn mutual connections as you browse."
          connected={extensionConnected}
        >
          {!extensionConnected && (
            <div className="flex flex-col gap-3 pt-1">
              <ol className="flex flex-col gap-2">
                {[
                  "Download the Warmline extension and unzip it.",
                  "Open chrome://extensions, enable Developer mode.",
                  "Click Load unpacked and select the folder.",
                  "Open a lead's LinkedIn profile to capture mutuals.",
                ].map((text, i) => (
                  <li key={i} className="flex gap-2 text-xs text-secondary-foreground">
                    <span className="flex size-4 shrink-0 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    {text}
                  </li>
                ))}
              </ol>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a
                    href="https://github.com/warmline/extension/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <DownloadIcon className="size-3.5" aria-hidden />
                    Download
                  </a>
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={onMarkExtension}>
                  <CheckIcon className="size-3.5" aria-hidden />
                  Mark installed
                </Button>
              </div>
            </div>
          )}
        </SourceCard>
      </div>

      {error && (
        <p className="mt-4 text-sm text-destructive-foreground">{error}</p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={onBuild} className="w-full">
          {connectedCount > 0 ? "Build my network" : "Build my network"}
        </Button>
        {connectedCount === 0 && (
          <p className="text-center text-xs text-muted-foreground">
            No sources connected yet — you can always add them later in Settings.
          </p>
        )}
      </div>
    </div>
  );
}

function SourceCard({
  Icon,
  name,
  blurb,
  connected,
  children,
}: {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  name: string;
  blurb: string;
  connected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 [box-shadow:var(--shadow-s)]",
        connected ? "border-[oklch(0.42_0.11_152/0.4)]" : "border-border",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg [background-image:var(--velour-raised)] [box-shadow:var(--shadow-button)]">
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{name}</span>
            {connected && (
              <span className="flex items-center gap-1 rounded-full bg-[oklch(0.92_0.06_150)] px-2 py-0.5 text-[11px] font-medium text-[oklch(0.42_0.11_152)]">
                <CheckIcon className="size-2.5" aria-hidden />
                Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{blurb}</p>
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function LinkedInDropzone({
  busy,
  onFile,
}: {
  busy: boolean;
  onFile: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);

  function handle(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) handle(e.dataTransfer.files); }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-5 text-center transition-colors",
        dragging ? "border-ring/60 bg-primary/5" : "border-border hover:border-ring/30 bg-input",
        busy && "pointer-events-none opacity-60",
        "[box-shadow:var(--shadow-inset)]",
      )}
    >
      <UploadIcon className="size-4 text-muted-foreground" aria-hidden />
      <span className="text-xs font-medium text-foreground/85">
        {busy ? "Importing connections…" : "Drop your LinkedIn ZIP here or click to browse"}
      </span>
      <input
        type="file"
        accept=".zip,application/zip"
        disabled={busy}
        className="hidden"
        onChange={(e) => handle(e.target.files)}
      />
    </label>
  );
}
