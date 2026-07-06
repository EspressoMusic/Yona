"use client";

import { useEffect, useMemo, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SummaryCards } from "@/components/calendar/summary-cards";
import { MonthGrid } from "@/components/calendar/month-grid";
import { DayDetailPanel } from "@/components/calendar/day-detail-panel";
import { apiFetch } from "@/lib/api-client";
import type { AnalyticsSummary, CalendarDay } from "@/types/api";

export default function CalendarPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState(() => new Date());
  const [days, setDays] = useState<Record<string, CalendarDay>>({});
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [refreshing, setRefreshing] = useState(false);

  const monthParam = format(month, "yyyy-MM");

  async function load() {
    const [calendarRes, summaryRes] = await Promise.all([
      apiFetch<{ days: CalendarDay[] }>(`/api/calendar?month=${monthParam}`),
      apiFetch<AnalyticsSummary>(`/api/analytics/summary?month=${monthParam}`),
    ]);
    const byDate: Record<string, CalendarDay> = {};
    for (const d of calendarRes.days) byDate[d.date] = d;
    setDays(byDate);
    setSummary(summaryRes);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/month-change, not a render loop
    load().catch(() => showToast("error", "Failed to load calendar data"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthParam]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await apiFetch("/api/analytics/refresh", { method: "POST" });
      await load();
      showToast("success", "Analytics refreshed");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to refresh analytics");
    } finally {
      setRefreshing(false);
    }
  }

  const selectedDay = useMemo(() => days[selectedDate] ?? null, [days, selectedDate]);

  return (
    <div className="space-y-5">
      <SummaryCards summary={summary} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="w-40 text-center text-base font-semibold text-foreground">{format(month, "MMMM yyyy")}</h2>
          <Button variant="outline" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh analytics
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <MonthGrid month={month} days={days} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        <DayDetailPanel day={selectedDay} />
      </div>
    </div>
  );
}
