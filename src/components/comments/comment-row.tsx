"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Heart, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PLATFORM_META } from "@/lib/platforms";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import type { CommentItem, CommentReplyItem } from "@/types/api";

const REPLY_STATUS_TONE = {
  SENT: "success",
  FAILED: "danger",
  PENDING: "neutral",
} as const;

export function CommentRow({ comment, onReplied }: { comment: CommentItem; onReplied: (reply: CommentReplyItem) => void }) {
  const meta = PLATFORM_META[comment.platform];
  const { showToast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { reply } = await apiFetch<{ reply: CommentReplyItem }>(`/api/comments/${comment.id}/reply`, {
        method: "POST",
        body: JSON.stringify({ text: replyText }),
      });
      onReplied(reply);
      setReplyText("");
      if (reply.status === "FAILED") {
        showToast("error", reply.errorMessage || "Reply failed to send");
      } else {
        showToast("success", "Reply sent");
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">{comment.authorName}</span>
            {comment.authorHandle && <span className="text-xs text-muted-foreground">@{comment.authorHandle}</span>}
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.border} ${meta.color}`}>
              {meta.label}
            </span>
            <span className="text-xs text-muted-foreground">{format(new Date(comment.postedAt), "MMM d, h:mm a")}</span>
          </div>
          <p className="mt-1.5 text-sm text-foreground">{comment.text}</p>
          {comment.postPlatform?.post && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              On: {comment.postPlatform.post.caption || "(No caption)"}
            </p>
          )}
          {comment.likeCount != null && (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" /> {comment.likeCount}
            </div>
          )}
        </div>
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {comment.replies.map((r) => (
            <div key={r.id} className="rounded-lg bg-surface-muted px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground">{r.text}</p>
                <Badge tone={REPLY_STATUS_TONE[r.status]}>{r.status.toLowerCase()}</Badge>
              </div>
              {r.status === "FAILED" && r.errorMessage && (
                <p className="mt-1 text-xs text-danger">{r.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Input
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleReply()}
          placeholder="Write a reply..."
          className="flex-1"
        />
        <Button size="sm" loading={sending} onClick={handleReply} disabled={!replyText.trim()}>
          <Send className="h-4 w-4" /> Reply
        </Button>
      </div>
    </div>
  );
}
