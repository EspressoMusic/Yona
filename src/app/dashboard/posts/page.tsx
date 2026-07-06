"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { PostForm } from "@/components/posts/post-form";
import { PostTable } from "@/components/posts/post-table";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { PostItem, SocialAccountStatusItem, UserSettingsItem } from "@/types/api";

const TABS = [
  { key: "ALL", label: "All" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PUBLISHED", label: "Published" },
  { key: "DRAFT", label: "Drafts" },
  { key: "FAILED", label: "Failed" },
] as const;

export default function PostsPage() {
  const { showToast } = useToast();
  const [posts, setPosts] = useState<PostItem[] | null>(null);
  const [accounts, setAccounts] = useState<SocialAccountStatusItem[]>([]);
  const [settings, setSettings] = useState<UserSettingsItem | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostItem | null>(null);

  async function loadAll() {
    const [postsRes, accountsRes, settingsRes] = await Promise.all([
      apiFetch<{ posts: PostItem[] }>("/api/posts"),
      apiFetch<{ accounts: SocialAccountStatusItem[] }>("/api/social/accounts"),
      apiFetch<{ settings: UserSettingsItem }>("/api/settings"),
    ]);
    setPosts(postsRes.posts);
    setAccounts(accountsRes.accounts);
    setSettings(settingsRes.settings);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not a render loop
    loadAll().catch(() => showToast("error", "Failed to load posts"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSaved() {
    setFormOpen(false);
    setEditingPost(null);
    loadAll().catch(() => undefined);
  }

  async function handleDelete() {
    if (!deletingPost) return;
    try {
      await apiFetch(`/api/posts/${deletingPost.id}`, { method: "DELETE" });
      showToast("success", "Post deleted");
      setDeletingPost(null);
      loadAll().catch(() => undefined);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete post");
    }
  }

  async function handlePublish(post: PostItem) {
    try {
      await apiFetch(`/api/posts/${post.id}/publish`, { method: "POST" });
      showToast("success", "Publish attempted — check status below");
      loadAll().catch(() => undefined);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to publish post");
    }
  }

  const filtered = (posts ?? []).filter((p) => tab === "ALL" || p.status === tab);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                tab === t.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="posts-tab-pill"
                  className="absolute inset-0 rounded-lg bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" /> New post
        </Button>
      </div>

      {posts === null ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center text-sm text-muted-foreground">
          Loading posts...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Send}
          title="No posts yet"
          description="Create your first post, add media and a caption, then publish now or schedule it for later."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New post
            </Button>
          }
        />
      ) : (
        <PostTable
          posts={filtered}
          onEdit={(post) => setEditingPost(post)}
          onDelete={(post) => setDeletingPost(post)}
          onPublish={handlePublish}
        />
      )}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="New post" className="max-w-xl">
        <PostForm mode="create" accounts={accounts} settings={settings} onSaved={handleSaved} onCancel={() => setFormOpen(false)} />
      </Dialog>

      <Dialog open={!!editingPost} onClose={() => setEditingPost(null)} title="Edit post" className="max-w-xl">
        {editingPost && (
          <PostForm
            mode="edit"
            initialPost={editingPost}
            accounts={accounts}
            settings={settings}
            onSaved={handleSaved}
            onCancel={() => setEditingPost(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!deletingPost} onClose={() => setDeletingPost(null)} title="Delete post?">
        <p className="text-sm text-muted-foreground">
          This will permanently delete this post{deletingPost?.status === "SCHEDULED" ? " and cancel its schedule" : ""}. This
          can&apos;t be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeletingPost(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
