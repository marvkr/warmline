"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Crown, Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FEED, GOAL, type Confidence, type FeedRow } from "./feed-data";

const DOT: Record<Confidence, string> = {
  high: "bg-[oklch(0.82_0.11_165)]",
  medium: "bg-[oklch(0.85_0.1_85)]",
  low: "bg-[oklch(0.7_0.16_25)]",
};

export default function Home() {
  const [desc, setDesc] = useState(true);
  const [votes, setVotes] = useState<Record<string, "good" | "bad" | undefined>>({});

  const rows = useMemo(
    () => [...FEED].sort((a, b) => (desc ? b.score - a.score : a.score - b.score)),
    [desc],
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Warmline</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Who to reach out to, why, and how.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm [box-shadow:var(--shadow-s)]">
            <span className="text-muted-foreground">Goal</span>
            <span className="font-medium">{GOAL}</span>
            <Button variant="ghost" size="sm" className="ml-1 h-7 px-2 text-xs">
              Edit
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="size-4" /> Find more
          </Button>
        </div>
      </header>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%]">Person</TableHead>
            <TableHead className="w-[140px]">
              <button
                onClick={() => setDesc((d) => !d)}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                Score <ArrowUpDown className="size-3.5" />
              </button>
            </TableHead>
            <TableHead>Why</TableHead>
            <TableHead className="w-[120px]">Mutuals</TableHead>
            <TableHead className="w-[120px] text-right">Feedback</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <FeedRowView
              key={row.id}
              row={row}
              vote={votes[row.id]}
              onVote={(v) =>
                setVotes((prev) => ({
                  ...prev,
                  [row.id]: prev[row.id] === v ? undefined : v,
                }))
              }
            />
          ))}
        </TableBody>
      </Table>
    </main>
  );
}

function FeedRowView({
  row,
  vote,
  onVote,
}: {
  row: FeedRow;
  vote: "good" | "bad" | undefined;
  onVote: (v: "good" | "bad") => void;
}) {
  return (
    <TableRow>
      {/* Person */}
      <TableCell className="align-top">
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5">
            <AvatarFallback>{row.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.name}</span>
              <span
                className="grid size-4 shrink-0 place-items-center rounded-[3px] bg-[#0a66c2] text-[9px] font-bold leading-none text-white"
                aria-label="LinkedIn profile"
              >
                in
              </span>
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {row.company} · {row.role}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {row.kind === "lead" ? (
                <Badge variant="secondary">Lead</Badge>
              ) : (
                <Badge variant="primary">Warm intro</Badge>
              )}
              {row.gatekeeper && (
                <Badge variant="warning" className="gap-1">
                  <Crown className="size-3" /> Gatekeeper
                </Badge>
              )}
              {row.unlocks ? <Badge variant="outline">unlocks {row.unlocks}</Badge> : null}
            </div>
          </div>
        </div>
      </TableCell>

      {/* Score */}
      <TableCell className="align-top">
        <div className="text-2xl font-semibold tabular-nums">{row.score}</div>
        <div className="mt-2 flex items-center gap-2">
          <Progress value={row.tieStrength} className="h-1.5 w-16" />
          <span className="text-[11px] text-muted-foreground">tie {row.tieStrength}</span>
        </div>
      </TableCell>

      {/* Why */}
      <TableCell className="align-top">
        <ul className="space-y-1.5">
          {row.why.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <span
                className={cn("mt-1 size-1.5 shrink-0 rounded-full", DOT[b.confidence])}
                aria-label={`${b.confidence} confidence`}
              />
              <span className="text-secondary-foreground">{b.text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">How:</span> {row.how}
        </p>
      </TableCell>

      {/* Mutuals */}
      <TableCell className="align-top">
        <AvatarGroup max={3}>
          {row.mutuals.map((m) => (
            <Avatar key={m.name} className="ring-2 ring-background">
              <AvatarFallback className="text-[10px]">{m.initials}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
        <Button variant="link" size="sm" className="mt-1 h-auto px-0 text-xs">
          Ask your network
        </Button>
      </TableCell>

      {/* Feedback */}
      <TableCell className="align-top text-right">
        <div className="inline-flex gap-1">
          <Button
            variant={vote === "good" ? "primary" : "ghost"}
            size="icon"
            className="size-8"
            aria-label="Good, more like this"
            onClick={() => onVote("good")}
          >
            <ThumbsUp className="size-4" />
          </Button>
          <Button
            variant={vote === "bad" ? "destructive" : "ghost"}
            size="icon"
            className="size-8"
            aria-label="Bad, fewer like this"
            onClick={() => onVote("bad")}
          >
            <ThumbsDown className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
