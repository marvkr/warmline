"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "@/components/icons";
import { LinkedinIcon, XIcon } from "@/components/icons/brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WarmGraph } from "@/components/warm-graph";
import { cn } from "@/lib/utils";

type Row = FunctionReturnType<typeof api.feed.list>[number];
type Confidence = "high" | "medium" | "low";

const DOT: Record<Confidence, string> = {
  high: "bg-[oklch(0.82_0.11_165)]",
  medium: "bg-[oklch(0.85_0.1_85)]",
  low: "bg-[oklch(0.7_0.16_25)]",
};

function linkedinHref(slug?: string) {
  return slug ? `https://www.linkedin.com/in/${slug}` : undefined;
}
function xHref(handle?: string) {
  return handle ? `https://x.com/${handle.replace(/^@/, "")}` : undefined;
}

export default function Home() {
  const [desc, setDesc] = useState(true);
  const [expanded, setExpanded] = useState<Id<"persons"> | null>(null);

  const feed = useQuery(api.feed.list, { limit: 40 });
  const icp = useQuery(api.icp.latest, {});
  const vote = useMutation(api.feedback.vote);

  const rows = useMemo(() => {
    const data = feed ?? [];
    return [...data].sort((a, b) => (desc ? b.score - a.score : a.score - b.score));
  }, [feed, desc]);

  return (
    <div className="w-full px-8 py-8">
      <header className="mb-7">
        <h1 className="text-xl font-semibold tracking-tight">
          Who to reach out to
        </h1>
        <p className="mt-1.5 text-sm text-foreground/60">
          Ranked by how warm the path is and how well they fit your goal —{" "}
          <span className="text-foreground/80 font-medium">refreshed daily</span>.
        </p>
      </header>

      {feed === undefined ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading your network…
        </p>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No people yet — connect a source to load your network.
        </p>
      ) : (
        <TooltipProvider delayDuration={150}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[210px]">Person</TableHead>
                <TableHead className="w-[118px]">
                  <button
                    onClick={() => setDesc((d) => !d)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    Score{" "}
                    {desc ? (
                      <ChevronDownIcon className="size-3.5" />
                    ) : (
                      <ChevronUpIcon className="size-3.5" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="min-w-[300px]">Why</TableHead>
                <TableHead className="min-w-[240px]">How</TableHead>
                <TableHead className="w-[100px]">Mutuals</TableHead>
                <TableHead className="w-[88px] text-right">Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <FeedRowView
                  key={row.id}
                  row={row}
                  expanded={expanded === row.id}
                  onToggle={() =>
                    setExpanded((cur) => (cur === row.id ? null : row.id))
                  }
                  onVote={(v) => {
                    if (icp) {
                      void vote({
                        icpId: icp._id,
                        personId: row.id,
                        vote: v === "good" ? "up" : "down",
                      });
                    }
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </TooltipProvider>
      )}
    </div>
  );
}

function GraphAccordion({ personId }: { personId: Id<"persons"> }) {
  const data = useQuery(api.graph.pathForPerson, { personId });
  if (data === undefined)
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        Tracing the warm path…
      </div>
    );
  return <WarmGraph data={data} />;
}

function SocialLink({
  href,
  children,
  label,
}: {
  href?: string;
  children: React.ReactNode;
  label: string;
}) {
  if (!href)
    return (
      <span className="text-muted-foreground/40" aria-hidden>
        {children}
      </span>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </a>
  );
}

function FeedRowView({
  row,
  expanded,
  onToggle,
  onVote,
}: {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
  onVote: (v: "good" | "bad") => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        {/* Person */}
        <TableCell className="align-top">
          <div className="flex items-start gap-3">
            <Avatar className="mt-0.5">
              {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
              <AvatarFallback>{row.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium">{row.name}</span>
                <SocialLink
                  href={linkedinHref(row.linkedinUrl)}
                  label={`${row.name} on LinkedIn`}
                >
                  <LinkedinIcon role="img" className="size-3.5 shrink-0" />
                </SocialLink>
                <SocialLink
                  href={xHref(row.xHandle)}
                  label={`${row.name} on X`}
                >
                  <XIcon role="img" className="size-3 shrink-0" />
                </SocialLink>
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {[row.company, row.role].filter(Boolean).join(" · ")}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {row.kind === "lead" ? (
                  <Badge variant="secondary">Lead</Badge>
                ) : (
                  <Badge variant="primary">Connector</Badge>
                )}
                {row.gatekeeper && (
                  <Badge variant="warning" className="gap-1">
                    <KeyIcon className="size-3" /> Key
                  </Badge>
                )}
                {row.unlocks ? (
                  <Badge variant="outline">unlocks {row.unlocks}</Badge>
                ) : null}
              </div>
            </div>
          </div>
        </TableCell>

        {/* Score */}
        <TableCell className="align-top">
          <div className="text-2xl font-semibold tabular-nums">{row.score}</div>
          <div className="mt-2 flex items-center gap-2">
            <Progress value={row.tieStrength} className="h-1.5 w-14" />
            <span className="text-[11px] text-muted-foreground">
              {row.tieStrength}
            </span>
          </div>
        </TableCell>

        {/* Why */}
        <TableCell className="align-top">
          <ul className="space-y-1.5">
            {row.why.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-snug">
                <span
                  className={cn(
                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                    DOT[b.confidence],
                  )}
                  aria-label={`${b.confidence} confidence`}
                />
                <span className="text-secondary-foreground">{b.text}</span>
              </li>
            ))}
          </ul>
        </TableCell>

        {/* How */}
        <TableCell className="align-top">
          <p className="text-[13px] leading-snug text-muted-foreground">
            {row.how}
          </p>
        </TableCell>

        {/* Mutuals */}
        <TableCell className="align-top">
          {row.mutuals.length > 0 ? (
            <AvatarGroup max={3}>
              {row.mutuals.map((m) => (
                <Tooltip key={m.name}>
                  <TooltipTrigger asChild>
                    <Avatar className="ring-2 ring-background">
                      <AvatarFallback className="text-[10px]">
                        {m.initials}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{m.name}</TooltipContent>
                </Tooltip>
              ))}
            </AvatarGroup>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </TableCell>

        {/* Feedback */}
        <TableCell
          className="align-top text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="inline-flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Good, more like this"
              onClick={() => onVote("good")}
            >
              <ThumbsUpIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Bad, fewer like this"
              onClick={() => onVote("bad")}
            >
              <ThumbsDownIcon className="size-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/10 p-3">
            <GraphAccordion personId={row.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
