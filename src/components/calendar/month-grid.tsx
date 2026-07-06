"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { cn, formatNumber } from "@/lib/utils";
import type { CalendarDay } from "@/types/api";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthGrid({
  month,
  days,
  selectedDate,
  onSelectDate,
}: {
  month: Date;
  days: Record<string, CalendarDay>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {allDays.map((date) => {
          const key = format(date, "yyyy-MM-dd");
          const day = days[key];
          const inMonth = isSameMonth(date, month);
          const selected = key === selectedDate;

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              className={cn(
                "flex min-h-[92px] flex-col items-start gap-1 border-b border-r border-border p-2 text-left transition-colors last:border-r-0",
                !inMonth && "bg-surface-muted/50 text-muted-foreground",
                selected && "bg-primary/10 ring-1 ring-inset ring-primary",
                "hover:bg-surface-muted"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday(date) && "bg-primary text-primary-foreground"
                )}
              >
                {format(date, "d")}
              </span>
              {day && (day.scheduledPosts.length > 0 || day.publishedPosts.length > 0 || day.totalViews > 0) && (
                <div className="flex w-full flex-col gap-0.5 text-[11px]">
                  {day.scheduledPosts.length > 0 && (
                    <span className="truncate rounded bg-info/10 px-1 py-0.5 text-info">
                      {day.scheduledPosts.length} scheduled
                    </span>
                  )}
                  {day.publishedPosts.length > 0 && (
                    <span className="truncate rounded bg-success/10 px-1 py-0.5 text-success">
                      {day.publishedPosts.length} published
                    </span>
                  )}
                  {day.totalViews > 0 && (
                    <span className="truncate text-muted-foreground">{formatNumber(day.totalViews)} views</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
