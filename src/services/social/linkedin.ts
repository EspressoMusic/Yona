import type {
  AnalyticsResult,
  PlatformComment,
  PublishContent,
  PublishResult,
  ReplyResult,
  SocialAccountContext,
  SocialService,
  TokenExchangeResult,
} from "./types";
import { NOT_CONFIGURED_ANALYTICS } from "./types";

// LinkedIn UGC Posts API for organization/member shares.
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
//
// Required env vars:
//   LINKEDIN_CLIENT_ID
//   LINKEDIN_CLIENT_SECRET
//   LINKEDIN_REDIRECT_URI

const API_BASE = "https://api.linkedin.com/v2";

function isConfigured(): boolean {
  return Boolean(
    process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET && process.env.LINKEDIN_REDIRECT_URI
  );
}

function getAuthUrl(state: string): string | null {
  if (!isConfigured()) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    state,
    scope: "openid profile w_member_social",
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  if (!isConfigured()) {
    throw new Error("LinkedIn is not configured. Set LINKEDIN_CLIENT_ID/SECRET/REDIRECT_URI.");
  }
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  });
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || "Failed to exchange LinkedIn OAuth code");
  }

  // TODO: call /v2/userinfo (OpenID Connect) to resolve the member's URN,
  // which is required as the `author` field when creating a UGC post.
  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

async function publishPost(
  account: SocialAccountContext,
  content: PublishContent
): Promise<PublishResult> {
  if (!isConfigured()) {
    return { success: false, error: "LinkedIn is not configured on this server." };
  }
  if (!account.accessToken || !account.accountId) {
    return { success: false, error: "LinkedIn account is not fully connected." };
  }

  try {
    const authorUrn = `urn:li:person:${account.accountId}`;
    const text = [content.caption, ...content.hashtags].join(" ").trim();

    const body = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: content.media.length ? "IMAGE" : "NONE",
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };

    const res = await fetch(`${API_BASE}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.message || "Failed to publish to LinkedIn" };
    }
    const postId = res.headers.get("x-restli-id") || undefined;
    return {
      success: true,
      platformPostId: postId,
      platformUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "LinkedIn publish failed" };
  }
}

async function getAnalytics(
  account: SocialAccountContext,
  platformPostId: string
): Promise<AnalyticsResult> {
  if (!isConfigured() || !account.accessToken) return NOT_CONFIGURED_ANALYTICS;
  try {
    const params = new URLSearchParams({ q: "organizationalEntity", shares: `List(${platformPostId})` });
    const res = await fetch(`${API_BASE}/organizationalEntityShareStatistics?${params.toString()}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    if (!res.ok) return NOT_CONFIGURED_ANALYTICS;
    const data = await res.json();
    const stats = data.elements?.[0]?.totalShareStatistics;
    if (!stats) return NOT_CONFIGURED_ANALYTICS;
    return {
      views: stats.impressionCount ?? 0,
      likes: stats.likeCount ?? 0,
      comments: stats.commentCount ?? 0,
      shares: stats.shareCount ?? 0,
    };
  } catch {
    return NOT_CONFIGURED_ANALYTICS;
  }
}

async function getComments(
  account: SocialAccountContext,
  platformPostId: string
): Promise<PlatformComment[]> {
  if (!isConfigured() || !account.accessToken) return [];
  try {
    const res = await fetch(`${API_BASE}/socialActions/${platformPostId}/comments`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.elements ?? []).map(
      (c: { $URN: string; actor?: string; message?: { text?: string }; created?: { time?: number } }) => ({
        platformCommentId: c.$URN,
        authorName: c.actor || "LinkedIn user",
        text: c.message?.text || "",
        postedAt: c.created?.time ? new Date(c.created.time) : new Date(),
      })
    );
  } catch {
    return [];
  }
}

async function replyToComment(
  account: SocialAccountContext,
  platformCommentId: string,
  text: string
): Promise<ReplyResult> {
  if (!isConfigured() || !account.accessToken) {
    return { success: false, error: "LinkedIn is not connected." };
  }
  try {
    const res = await fetch(`${API_BASE}/socialActions/${platformCommentId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { text } }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.message || "Failed to send LinkedIn reply" };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "LinkedIn reply failed" };
  }
}

export const linkedinService: SocialService = {
  platform: "LINKEDIN",
  isConfigured,
  getAuthUrl,
  exchangeCodeForToken,
  publishPost,
  getAnalytics,
  getComments,
  replyToComment,
};
