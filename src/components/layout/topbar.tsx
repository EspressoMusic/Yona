"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

const TITLES: Record<string, string> = {
  "/dashboard/posts": "Posts & Scheduler",
  "/dashboard/settings": "Settings & Connections",
  "/dashboard/calendar": "Calendar & Growth",
  "/dashboard/comments": "Comments & Audience",
};

export function Topbar({
  onMenuClick,
  name,
  email,
}: {
  onMenuClick: () => void;
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const title = Object.entries(TITLES).find(([href]) => pathname?.startsWith(href))?.[1] ?? "Dashboard";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-muted-foreground hover:bg-surface-muted md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground sm:text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
