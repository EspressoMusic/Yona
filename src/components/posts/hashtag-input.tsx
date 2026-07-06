"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function HashtagInput({
  hashtags,
  onChange,
}: {
  hashtags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit(value: string) {
    const cleaned = value
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#+/, ""))
      .filter(Boolean);
    if (!cleaned.length) return;
    const merged = Array.from(new Set([...hashtags, ...cleaned]));
    onChange(merged);
    setDraft("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && hashtags.length) {
      onChange(hashtags.slice(0, -1));
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-2 focus-within:ring-2 focus-within:ring-primary/40">
      <div className="flex flex-wrap gap-1.5">
        {hashtags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
          >
            #{tag}
            <button
              type="button"
              onClick={() => onChange(hashtags.filter((t) => t !== tag))}
              className="hover:text-primary-hover"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft && commit(draft)}
          placeholder={hashtags.length ? "Add another..." : "marketing, launch, sale"}
          className="h-7 flex-1 min-w-[120px] border-none px-1 shadow-none focus:ring-0"
        />
      </div>
    </div>
  );
}
