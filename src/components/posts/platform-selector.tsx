"use client";

import { Check } from "lucide-react";
import { PLATFORM_LIST, PLATFORM_META } from "@/lib/platforms";
import type { Platform, SocialAccountStatusItem } from "@/types/api";
import { cn } from "@/lib/utils";

export function PlatformSelector({
  selected,
  onChange,
  accounts,
}: {
  selected: Platform[];
  onChange: (platforms: Platform[]) => void;
  accounts: SocialAccountStatusItem[];
}) {
  function toggle(platform: Platform) {
    if (selected.includes(platform)) {
      onChange(selected.filter((p) => p !== platform));
    } else {
      onChange([...selected, platform]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PLATFORM_LIST.map((platform) => {
        const meta = PLATFORM_META[platform];
        const account = accounts.find((a) => a.platform === platform);
        const active = selected.includes(platform);
        return (
          <button
            key={platform}
            type="button"
            onClick={() => toggle(platform)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active ? `${meta.bg} ${meta.border} ${meta.color}` : "border-border bg-surface text-foreground hover:bg-surface-muted"
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                active ? "border-current bg-current" : "border-border"
              )}
            >
              {active && <Check className="h-3 w-3 text-surface" />}
            </span>
            <span className="flex-1 truncate">{meta.label}</span>
            {!account?.connected && (
              <span className="text-[10px] font-normal text-muted-foreground">not connected</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
