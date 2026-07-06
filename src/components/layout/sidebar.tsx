"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rocket, Send, Settings, CalendarDays, MessagesSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard/posts", label: "Posts & Scheduler", icon: Send },
  { href: "/dashboard/settings", label: "Settings & Connections", icon: Settings },
  { href: "/dashboard/calendar", label: "Calendar & Growth", icon: CalendarDays },
  { href: "/dashboard/comments", label: "Comments & Audience", icon: MessagesSquare },
];

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Rocket className="h-4.5 w-4.5" />
        </div>
        <span className="text-base font-semibold text-foreground">SocialPilot</span>
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
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 text-xs text-muted-foreground">
        SocialPilot &copy; {new Date().getFullYear()}
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:flex">
      <SidebarContent />
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
