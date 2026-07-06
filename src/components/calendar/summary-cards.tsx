import { Eye, MessageCircle, Trophy, TrendingUp, Radio } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_META } from "@/lib/platforms";
import { formatNumber, cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/types/api";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Eye;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const bestPlatformMeta = summary.bestPlatform ? PLATFORM_META[summary.bestPlatform.platform] : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard icon={Eye} label="Total views this month" value={formatNumber(summary.totalViews)} />
      <StatCard icon={MessageCircle} label="Total comments this month" value={formatNumber(summary.totalComments)} />
      <StatCard
        icon={Trophy}
        label="Best performing post"
        value={summary.bestPost ? formatNumber(summary.bestPost.views) : "—"}
        hint={summary.bestPost ? summary.bestPost.caption.slice(0, 40) || "(No caption)" : "No data yet"}
      />
      <StatCard
        icon={Radio}
        label="Best platform"
        value={bestPlatformMeta ? bestPlatformMeta.label : "—"}
        hint={summary.bestPlatform ? `${formatNumber(summary.bestPlatform.views)} views` : "No data yet"}
      />
      <StatCard
        icon={TrendingUp}
        label="Engagement growth"
        value={
          <span className={cn(summary.engagementGrowth >= 0 ? "text-success" : "text-danger")}>
            {summary.engagementGrowth >= 0 ? "+" : ""}
            {summary.engagementGrowth}%
          </span>
        }
        hint="vs. last month"
      />
    </div>
  );
}
