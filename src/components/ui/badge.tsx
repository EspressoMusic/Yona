import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-muted-foreground border-border",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-danger/10 text-danger border-danger/20",
  info: "bg-info/10 text-info border-info/20",
  primary: "bg-primary/10 text-primary border-primary/20",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}

const POST_STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  PENDING: "neutral",
  SCHEDULED: "info",
  PUBLISHING: "warning",
  PUBLISHED: "success",
  FAILED: "danger",
  PARTIAL: "warning",
  SENT: "success",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={POST_STATUS_TONE[status] ?? "neutral"}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </Badge>
  );
}
