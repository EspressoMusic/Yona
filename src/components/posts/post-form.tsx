"use client";

import { useMemo, useState } from "react";
import { Send, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { HashtagInput } from "./hashtag-input";
import { MediaUploader } from "./media-uploader";
import { PlatformSelector } from "./platform-selector";
import { composePost } from "@/lib/post-compose";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { MediaItem, Platform, PostItem, SocialAccountStatusItem, UserSettingsItem } from "@/types/api";

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostForm({
  mode,
  initialPost,
  accounts,
  settings,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  initialPost?: PostItem;
  accounts: SocialAccountStatusItem[];
  settings: UserSettingsItem | null;
  onSaved: (post: PostItem) => void;
  onCancel?: () => void;
}) {
  const { showToast } = useToast();
  const [rawCaption, setRawCaption] = useState(initialPost?.rawCaption ?? "");
  const [hashtags, setHashtags] = useState<string[]>(initialPost?.hashtags ?? []);
  const [platforms, setPlatforms] = useState<Platform[]>(
    initialPost?.platformPosts.map((p) => p.platform) ?? []
  );
  const [media, setMedia] = useState<MediaItem[]>(initialPost?.media ?? []);
  const [publishMode, setPublishMode] = useState<"now" | "schedule">(
    initialPost?.scheduledAt && !initialPost?.publishNow ? "schedule" : "now"
  );
  const [scheduledAt, setScheduledAt] = useState(toLocalDateTimeInput(initialPost?.scheduledAt ?? null));
  const [applyDefaultCaption, setApplyDefaultCaption] = useState(true);
  const [applyDefaultHashtags, setApplyDefaultHashtags] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      composePost({
        rawCaption,
        hashtags,
        defaultCaption: settings?.defaultCaption,
        defaultHashtags: settings?.defaultHashtags,
        applyDefaultCaption: mode === "create" ? applyDefaultCaption : false,
        applyDefaultHashtags: mode === "create" ? applyDefaultHashtags : false,
      }),
    [rawCaption, hashtags, settings, applyDefaultCaption, applyDefaultHashtags, mode]
  );

  const hasDefaults = Boolean(settings?.defaultCaption || settings?.defaultHashtags?.length);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (platforms.length === 0) {
      setError("Choose at least one platform to publish to");
      return;
    }
    if (publishMode === "schedule" && !scheduledAt) {
      setError("Choose a date and time to schedule this post");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        rawCaption,
        hashtags,
        platforms,
        mediaIds: media.map((m) => m.id),
        publishNow: publishMode === "now",
        scheduledAt: publishMode === "schedule" ? new Date(scheduledAt).toISOString() : null,
        applyDefaultCaption,
        applyDefaultHashtags,
      };

      const { post } =
        mode === "create"
          ? await apiFetch<{ post: PostItem }>("/api/posts", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          : await apiFetch<{ post: PostItem }>(`/api/posts/${initialPost!.id}`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });

      showToast("success", mode === "create" ? "Post saved" : "Post updated");
      onSaved(post);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div>
        <Label>Media</Label>
        <MediaUploader media={media} onChange={setMedia} />
      </div>

      <div>
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          rows={4}
          value={rawCaption}
          onChange={(e) => setRawCaption(e.target.value)}
          placeholder="Write your post caption..."
        />
      </div>

      <div>
        <Label>Hashtags</Label>
        <HashtagInput hashtags={hashtags} onChange={setHashtags} />
      </div>

      {mode === "create" && hasDefaults && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-muted p-3">
          <p className="text-xs font-medium text-muted-foreground">Defaults from Settings</p>
          {settings?.defaultCaption && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={applyDefaultCaption}
                onChange={(e) => setApplyDefaultCaption(e.target.checked)}
                className="rounded border-border"
              />
              Add default caption
            </label>
          )}
          {settings?.defaultHashtags && settings.defaultHashtags.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={applyDefaultHashtags}
                onChange={(e) => setApplyDefaultHashtags(e.target.checked)}
                className="rounded border-border"
              />
              Add default hashtags ({settings.defaultHashtags.map((h) => `#${h}`).join(" ")})
            </label>
          )}
        </div>
      )}

      {(rawCaption || hashtags.length > 0) && (
        <div className="rounded-lg border border-border bg-surface-muted p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Preview</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {preview.caption}
            {preview.hashtags.length > 0 && (
              <span className="text-primary"> {preview.hashtags.join(" ")}</span>
            )}
          </p>
        </div>
      )}

      <div>
        <Label>Platforms</Label>
        <PlatformSelector selected={platforms} onChange={setPlatforms} accounts={accounts} />
      </div>

      <div>
        <Label>When</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPublishMode("now")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
              publishMode === "now" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" /> Publish now
          </button>
          <button
            type="button"
            onClick={() => setPublishMode("schedule")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
              publishMode === "schedule" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
            )}
          >
            <CalendarClock className="h-4 w-4" /> Schedule for later
          </button>
        </div>
        {publishMode === "schedule" && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={saving}>
          {mode === "create" ? (publishMode === "now" ? "Publish now" : "Schedule post") : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
