"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarItem,
} from "@/components/ui/sidebar";

// App shell: the sidebar lives here so it's present on every authed page.
// Hidden on the sign-in screen.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/signin") return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="shrink-0">
        <SidebarHeader>
          <span className="flex items-center gap-2">
            <WarmlineMark className="size-[22px] shrink-0" />
            <span className="text-base font-semibold tracking-tight">
              Warmline
            </span>
          </span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarItem
              label="Feed"
              active={pathname === "/"}
              onClick={() => router.push("/")}
            />
            <SidebarItem
              label="Sources"
              active={pathname.startsWith("/connectors")}
              onClick={() => router.push("/connectors")}
            />
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <p className="px-3 py-1 text-sm text-foreground/60">
            Refreshed daily
          </p>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

// The Warmline mark — same shape as the favicon / extension icon.
function WarmlineMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Warmline"
    >
      <defs>
        <linearGradient
          id="warmline-mark"
          x1="0"
          y1="0"
          x2="0"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#f6e3ad" />
          <stop offset="1" stopColor="#e2b766" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#warmline-mark)" />
      <g
        fill="none"
        stroke="#2a231a"
        strokeWidth="5.5"
        strokeLinecap="round"
      >
        <path d="M21.7 38.2 A11 11 0 0 1 42.3 38.2" />
        <path d="M15.5 32.5 A19 19 0 0 1 48.5 32.5" />
      </g>
      <circle cx="32" cy="42" r="5" fill="#2a231a" />
    </svg>
  );
}
