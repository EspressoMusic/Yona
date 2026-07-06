"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORM_META } from "@/lib/platforms";
import { useToast } from "@/components/ui/toast";
import type { SocialAccountStatusItem } from "@/types/api";

export function ConnectionCard({
  account,
  onDisconnected,
}: {
  account: SocialAccountStatusItem;
  onDisconnected: () => void;
}) {
  const meta = PLATFORM_META[account.platform];
  const { showToast } = useToast();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/social/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: account.platform }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect");
      }
      showToast("success", `${meta.label} disconnected`);
      onDisconnected();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${meta.bg} ${meta.border} ${meta.color} text-sm font-semibold`}>
          {meta.label.charAt(0)}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">{meta.label}</p>
          {account.connected ? (
            <p className="text-xs text-muted-foreground">{account.accountName}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {account.configured ? "Not connected" : "Not configured on this server"}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {account.connected ? (
          <>
            <Badge tone="success">Connected</Badge>
            <Button variant="outline" size="sm" loading={disconnecting} onClick={handleDisconnect}>
              Disconnect
            </Button>
          </>
        ) : account.configured ? (
          <a
            href={`/api/social/connect/${account.platform.toLowerCase()}`}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Connect
          </a>
        ) : (
          <Badge tone="neutral">Not configured</Badge>
        )}
      </div>
    </div>
  );
}
