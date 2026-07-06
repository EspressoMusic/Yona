import { format, parseISO } from "date-fns";
import { Eye, Heart, MessageCircle, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, cn } from "@/lib/utils";
import type { CalendarDay } from "@/types/api";

function MetricPill({ icon: Icon, value, label }: { icon: typeof Eye; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-sm font-semibold text-foreground">{formatNumber(value)}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function DayDetailPanel({ day }: { day: CalendarDay | null }) {
  if (!day) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Select a day to see details.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{format(parseISO(day.date), "EEEE, MMMM d")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <MetricPill icon={Eye} value={day.totalViews} label="Views" />
          <MetricPill icon={Heart} value={day.totalLikes} label="Likes" />
          <MetricPill icon={MessageCircle} value={day.totalComments} label="Comments" />
          <MetricPill icon={Share2} value={day.totalShares} label="Shares" />
        </div>

        {day.growthVsPrevDay !== null && (
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium",
              day.growthVsPrevDay >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            )}
          >
            {day.growthVsPrevDay >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {day.growthVsPrevDay >= 0 ? "+" : ""}
            {day.growthVsPrevDay}% views vs previous day
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Scheduled ({day.scheduledPosts.length})</p>
          {day.scheduledPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled</p>
          ) : (
            <ul className="space-y-1">
              {day.scheduledPosts.map((p) => (
                <li key={p.id} className="truncate rounded-lg bg-info/10 px-2 py-1.5 text-sm text-info">
                  {p.caption || "(No caption)"}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Published ({day.publishedPosts.length})</p>
          {day.publishedPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing published</p>
          ) : (
            <ul className="space-y-1">
              {day.publishedPosts.map((p) => (
                <li key={p.id} className="truncate rounded-lg bg-success/10 px-2 py-1.5 text-sm text-success">
                  {p.caption || "(No caption)"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
