"use client";

import { Sun, Moon, Monitor, Flame } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "LIGHT" as const, icon: Sun, label: "Light mode" },
  { value: "DARK" as const, icon: Moon, label: "Dark mode" },
  { value: "WARM" as const, icon: Flame, label: "Warm mode" },
  { value: "SYSTEM" as const, icon: Monitor, label: "System theme" },
];

export function ThemeToggle({
  onAfterChange,
}: {
  onAfterChange?: (theme: "LIGHT" | "DARK" | "SYSTEM" | "WARM") => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-lg border border-border bg-surface-muted p-0.5">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            aria-label={opt.label}
            onClick={() => {
              setTheme(opt.value);
              onAfterChange?.(opt.value);
            }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              active ? "bg-surface text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
