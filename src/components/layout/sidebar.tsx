"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Rocket,
  Send,
  Settings,
  CalendarDays,
  MessagesSquare,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard/posts", label: "Posts & Scheduler", icon: Send },
  { href: "/dashboard/settings", label: "Settings & Connections", icon: Settings },
  { href: "/dashboard/calendar", label: "Calendar & Growth", icon: CalendarDays },
  { href: "/dashboard/comments", label: "Comments & Audience", icon: MessagesSquare },
];

export function SidebarContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex items-center gap-2 px-5 py-5", collapsed && "justify-center px-2")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Rocket className="h-4.5 w-4.5" />
        </div>
        {!collapsed && <span className="text-base font-semibold text-foreground">SocialPilot</span>}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="px-5 py-4 text-xs text-muted-foreground">
          SocialPilot &copy; {new Date().getFullYear()}
        </div>
      )}
    </div>
  );
}

const COLLAPSE_STORAGE_KEY = "sp-sidebar-collapsed";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "true") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync with localStorage on mount
      setCollapsed(true);
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-border bg-surface transition-[width] duration-200 md:flex",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} />
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-sm hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 h-full w-72 bg-surface shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
