"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
} from "@/components/ui/sidebar";
import { WarmlineMark } from "@/components/warmline-mark";

// App shell: the sidebar lives here so it's present on every authed page.
// Hidden on the sign-in screen.
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/signin" || pathname === "/onboarding") return <>{children}</>;

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

