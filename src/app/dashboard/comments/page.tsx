"use client";

import { useEffect, useState } from "react";
import { MessagesSquare, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { CommentRow } from "@/components/comments/comment-row";
import { PLATFORM_LIST, PLATFORM_META } from "@/lib/platforms";
import { apiFetch } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";
import type { CommentItem, PostItem } from "@/types/api";

export default function CommentsPage() {
  const { showToast } = useToast();
  const [comments, setComments] = useState<CommentItem[] | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [platformFilter, setPlatformFilter] = useState("");
  const [postFilter, setPostFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [totalViews, setTotalViews] = useState(0);

  async function loadComments() {
    const params = new URLSearchParams();
    if (platformFilter) params.set("platform", platformFilter);
    if (postFilter) params.set("postId", postFilter);
    const { comments } = await apiFetch<{ comments: CommentItem[] }>(`/api/comments?${params.toString()}`);
    setComments(comments);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/filter-change, not a render loop
    loadComments().catch(() => showToast("error", "Failed to load comments"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, postFilter]);

  useEffect(() => {
    apiFetch<{ posts: PostItem[] }>("/api/posts")
      .then(({ posts }) => setPosts(posts.filter((p) => p.status === "PUBLISHED" || p.status === "PARTIAL")))
      .catch(() => undefined);
    apiFetch<{ totalViews: number }>(
      `/api/analytics/summary?month=${new Date().toISOString().slice(0, 7)}`
    )
      .then((s) => setTotalViews(s.totalViews))
      .catch(() => undefined);
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await apiFetch("/api/comments/refresh", { method: "POST" });
      await loadComments();
      showToast("success", "Comments refreshed");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to refresh comments");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total views (this month)</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{formatNumber(totalViews)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total comments loaded</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{comments?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="hidden sm:block">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Pending replies</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {comments?.filter((c) => c.replies.length === 0).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="w-44">
            <option value="">All platforms</option>
            {PLATFORM_LIST.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_META[p].label}
              </option>
            ))}
          </Select>
          <Select value={postFilter} onChange={(e) => setPostFilter(e.target.value)} className="w-56">
            <option value="">All posts</option>
            {posts.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.caption || "(No caption)").slice(0, 40)}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="secondary" size="sm" loading={refreshing} onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" /> Refresh comments
        </Button>
      </div>

      {comments === null ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="No comments yet"
          description="Once your posts are published and connected accounts sync, comments from your audience will show up here."
        />
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              onReplied={(reply) =>
                setComments((prev) =>
                  prev
                    ? prev.map((comment) =>
                        comment.id === c.id ? { ...comment, replies: [...comment.replies, reply] } : comment
                      )
                    : prev
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
