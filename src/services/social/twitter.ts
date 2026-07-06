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

// X (Twitter) API v2, OAuth2 with PKCE.
// Docs: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
//
// Required env vars:
//   TWITTER_CLIENT_ID
//   TWITTER_CLIENT_SECRET
//   TWITTER_REDIRECT_URI

const API_BASE = "https://api.twitter.com/2";

function isConfigured(): boolean {
  return Boolean(
    process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET && process.env.TWITTER_REDIRECT_URI
  );
}

function getAuthUrl(state: string, pkce?: { codeChallenge: string }): string | null {
  if (!isConfigured()) return null;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: process.env.TWITTER_REDIRECT_URI!,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: pkce?.codeChallenge || "challenge",
    code_challenge_method: pkce?.codeChallenge ? "S256" : "plain",
  });
  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code: string, codeVerifier?: string): Promise<TokenExchangeResult> {
  if (!isConfigured()) {
    throw new Error("X/Twitter is not configured. Set TWITTER_CLIENT_ID/SECRET/REDIRECT_URI.");
  }
  const basicAuth = Buffer.from(
    `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
  ).toString("base64");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.TWITTER_REDIRECT_URI!,
    code_verifier: codeVerifier || "challenge",
  });

  const res = await fetch(`${API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || "Failed to exchange X/Twitter OAuth code");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
  };
}

async function publishPost(
  account: SocialAccountContext,
  content: PublishContent
): Promise<PublishResult> {
  if (!isConfigured()) {
    return { success: false, error: "X/Twitter is not configured on this server." };
  }
  if (!account.accessToken) {
    return { success: false, error: "X/Twitter account is not fully connected." };
  }

  try {
    const text = [content.caption, ...content.hashtags].join(" ").trim().slice(0, 280);

    // TODO: for media tweets, upload bytes via the v1.1 media/upload
    // endpoint first and attach the returned media_id here. Text-only
    // tweets work with just the payload below.
    const res = await fetch(`${API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.detail || data?.title || "Failed to publish to X" };
    }
    const id = data.data?.id;
    return {
      success: true,
      platformPostId: id,
      platformUrl: id ? `https://x.com/i/web/status/${id}` : undefined,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "X publish failed" };
  }
}

async function getAnalytics(
  account: SocialAccountContext,
  platformPostId: string
): Promise<AnalyticsResult> {
  if (!isConfigured() || !account.accessToken) return NOT_CONFIGURED_ANALYTICS;
  try {
    const params = new URLSearchParams({ "tweet.fields": "public_metrics" });
    const res = await fetch(`${API_BASE}/tweets/${platformPostId}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return NOT_CONFIGURED_ANALYTICS;
    const metrics = data.data?.public_metrics;
    if (!metrics) return NOT_CONFIGURED_ANALYTICS;
    return {
      views: metrics.impression_count ?? 0,
      likes: metrics.like_count ?? 0,
      comments: metrics.reply_count ?? 0,
      shares: metrics.retweet_count ?? 0,
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
    const params = new URLSearchParams({
      query: `conversation_id:${platformPostId}`,
      "tweet.fields": "author_id,created_at,public_metrics",
    });
    const res = await fetch(`${API_BASE}/tweets/search/recent?${params.toString()}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return [];
    return (data.data ?? []).map(
      (t: { id: string; author_id: string; text: string; created_at: string; public_metrics?: { like_count?: number } }) => ({
        platformCommentId: t.id,
        authorName: t.author_id,
        text: t.text,
        likeCount: t.public_metrics?.like_count,
        postedAt: new Date(t.created_at),
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
    return { success: false, error: "X/Twitter is not connected." };
  }
  try {
    const res = await fetch(`${API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        reply: { in_reply_to_tweet_id: platformCommentId },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.detail || data?.title || "Failed to send X reply" };
    }
    return { success: true, platformReplyId: data.data?.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "X reply failed" };
  }
}

export const twitterService: SocialService = {
  platform: "TWITTER",
  isConfigured,
  getAuthUrl,
  exchangeCodeForToken,
  publishPost,
  getAnalytics,
  getComments,
  replyToComment,
};
