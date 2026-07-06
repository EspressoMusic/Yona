"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { HashtagInput } from "@/components/posts/hashtag-input";
import { ConnectionCard } from "@/components/settings/connection-card";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api-client";
import type { SocialAccountStatusItem, UserSettingsItem } from "@/types/api";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "This platform isn't configured on the server yet. Add its API credentials to .env first.",
  oauth_denied: "Connection was cancelled.",
  oauth_failed: "Something went wrong while connecting. Please try again.",
  state_mismatch: "Security check failed. Please try connecting again.",
  unknown_platform: "Unknown platform.",
};

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccountStatusItem[]>([]);
  const [defaultCaption, setDefaultCaption] = useState("");
  const [defaultHashtags, setDefaultHashtags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadAccounts() {
    const { accounts } = await apiFetch<{ accounts: SocialAccountStatusItem[] }>("/api/social/accounts");
    setAccounts(accounts);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, not a render loop
    loadAccounts().catch(() => showToast("error", "Failed to load connections"));
    apiFetch<{ settings: UserSettingsItem }>("/api/settings")
      .then(({ settings }) => {
        setDefaultCaption(settings.defaultCaption ?? "");
        setDefaultHashtags(settings.defaultHashtags ?? []);
      })
      .catch(() => showToast("error", "Failed to load settings"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) showToast("success", `${connected.charAt(0)}${connected.slice(1).toLowerCase()} connected`);
    if (error) showToast("error", OAUTH_ERROR_MESSAGES[error] || "Connection failed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch<{ settings: UserSettingsItem }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultCaption, defaultHashtags }),
      });
      showToast("success", "Preferences saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-sm text-muted-foreground">Choose light, dark, or match your system.</p>
          </div>
          <ThemeToggle
            onAfterChange={(theme) => {
              apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ theme }) }).catch(() =>
                showToast("error", "Failed to save theme preference")
              );
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accounts.map((account) => (
            <ConnectionCard key={account.platform} account={account} onDisconnected={loadAccounts} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default caption & hashtags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Added automatically to every new post, unless you remove them for that specific post.
          </p>
          <div>
            <Label htmlFor="default-caption">Default caption</Label>
            <Textarea
              id="default-caption"
              rows={3}
              value={defaultCaption}
              onChange={(e) => setDefaultCaption(e.target.value)}
              placeholder="e.g. Follow us for more updates!"
            />
          </div>
          <div>
            <Label>Default hashtags</Label>
            <HashtagInput hashtags={defaultHashtags} onChange={setDefaultHashtags} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}>
              Save preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
