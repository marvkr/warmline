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
          <span className="text-base font-semibold tracking-tight">
            Warmline
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
          <p className="px-3 py-1 text-xs text-muted-foreground">
            Refreshed daily
          </p>
        </SidebarFooter>
      </Sidebar>

      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
