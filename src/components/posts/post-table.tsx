"use client";

import { useState } from "react";
import { AlertCircle, Pencil, RefreshCw, Send, Trash2, Video, Image as ImageIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORM_META } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { PostItem } from "@/types/api";

const EDITABLE = new Set(["DRAFT", "SCHEDULED", "FAILED"]);

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PostTable({
  posts,
  onEdit,
  onDelete,
  onPublish,
}: {
  posts: PostItem[];
  onEdit: (post: PostItem) => void;
  onDelete: (post: PostItem) => void;
  onPublish: (post: PostItem) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handlePublish(post: PostItem) {
    setBusyId(post.id);
    try {
      await onPublish(post);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3">Post</th>
            <th className="px-4 py-3">Platforms</th>
            <th className="px-4 py-3">When</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => {
            const thumb = post.media[0];
            const canEdit = EDITABLE.has(post.status);
            const when = post.publishedAt || post.scheduledAt;
            return (
              <tr key={post.id} className="border-b border-border last:border-0 align-top">
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
                      {thumb ? (
                        thumb.type === "IMAGE" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb.url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Video className="h-5 w-5 text-muted-foreground" />
                        )
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="line-clamp-2 max-w-xs text-foreground">{post.caption || "(No caption)"}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {post.platformPosts.map((pp) => {
                      const meta = PLATFORM_META[pp.platform];
                      return (
                        <span
                          key={pp.id}
                          title={pp.errorMessage || undefined}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                            meta.bg,
                            meta.border,
                            meta.color
                          )}
                        >
                          {meta.label}
                          {pp.status === "FAILED" && <AlertCircle className="h-3 w-3 text-danger" />}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(when)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={post.status} />
                  {post.status === "FAILED" && post.platformPosts.some((p) => p.errorMessage) && (
                    <p className="mt-1 max-w-[180px] text-xs text-danger">
                      {post.platformPosts.find((p) => p.errorMessage)?.errorMessage}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {(post.status === "DRAFT" || post.status === "FAILED") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Publish now"
                        loading={busyId === post.id}
                        onClick={() => handlePublish(post)}
                      >
                        {post.status === "FAILED" ? <RefreshCw className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => onEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => onDelete(post)}>
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
