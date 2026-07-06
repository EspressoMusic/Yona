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

// Facebook Page publishing via the Graph API.
// Docs: https://developers.facebook.com/docs/pages/publishing
//
// Required env vars:
//   FACEBOOK_APP_ID
//   FACEBOOK_APP_SECRET
//   FACEBOOK_REDIRECT_URI

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function isConfigured(): boolean {
  return Boolean(
    process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET && process.env.FACEBOOK_REDIRECT_URI
  );
}

function getAuthUrl(state: string): string | null {
  if (!isConfigured()) return null;
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
    state,
    scope: "pages_show_list,pages_manage_posts,pages_read_engagement,pages_read_user_content",
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  if (!isConfigured()) {
    throw new Error("Facebook is not configured. Set FACEBOOK_APP_ID/SECRET/REDIRECT_URI.");
  }
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID!,
    client_secret: process.env.FACEBOOK_APP_SECRET!,
    redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to exchange Facebook OAuth code");
  }

  // TODO: exchange the short-lived user token for a long-lived Page access
  // token via /me/accounts, and store the Page id as accountId.
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
    return { success: false, error: "Facebook is not configured on this server." };
  }
  if (!account.accessToken || !account.accountId) {
    return { success: false, error: "Facebook Page is not fully connected." };
  }

  try {
    const message = [content.caption, ...content.hashtags].join(" ").trim();
    const media = content.media[0];

    let endpoint = `${GRAPH_BASE}/${account.accountId}/feed`;
    const params = new URLSearchParams({ access_token: account.accessToken, message });

    if (media?.type === "IMAGE") {
      endpoint = `${GRAPH_BASE}/${account.accountId}/photos`;
      params.set("url", media.url);
    } else if (media?.type === "VIDEO") {
      endpoint = `${GRAPH_BASE}/${account.accountId}/videos`;
      params.set("file_url", media.url);
      params.set("description", message);
      params.delete("message");
    }

    const res = await fetch(endpoint, { method: "POST", body: params });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || "Failed to publish to Facebook" };
    }
    const postId = data.post_id || data.id;
    return {
      success: true,
      platformPostId: postId,
      platformUrl: `https://www.facebook.com/${postId}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Facebook publish failed" };
  }
}

async function getAnalytics(
  account: SocialAccountContext,
  platformPostId: string
): Promise<AnalyticsResult> {
  if (!isConfigured() || !account.accessToken) return NOT_CONFIGURED_ANALYTICS;
  try {
    const params = new URLSearchParams({
      access_token: account.accessToken,
      fields: "insights.metric(post_impressions,post_reactions_by_type_total)",
    });
    const res = await fetch(`${GRAPH_BASE}/${platformPostId}?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) return NOT_CONFIGURED_ANALYTICS;

    const insights = data.insights?.data ?? [];
    const impressions = insights.find((i: { name: string }) => i.name === "post_impressions");
    const reactions = insights.find((i: { name: string }) => i.name === "post_reactions_by_type_total");
    const reactionValues = reactions?.values?.[0]?.value ?? {};
    const likes = Object.values(reactionValues as Record<string, number>).reduce(
      (sum: number, v) => sum + (typeof v === "number" ? v : 0),
      0
    );

    return {
      views: impressions?.values?.[0]?.value ?? 0,
      likes,
      comments: 0,
      shares: 0,
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
      access_token: account.accessToken,
      fields: "id,from,message,created_time,like_count",
    });
    const res = await fetch(`${GRAPH_BASE}/${platformPostId}/comments?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) return [];
    return (data.data ?? []).map(
      (c: {
        id: string;
        from?: { name?: string };
        message: string;
        created_time: string;
        like_count?: number;
      }) => ({
        platformCommentId: c.id,
        authorName: c.from?.name || "Facebook user",
        text: c.message,
        likeCount: c.like_count,
        postedAt: new Date(c.created_time),
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
    return { success: false, error: "Facebook is not connected." };
  }
  try {
    const params = new URLSearchParams({ access_token: account.accessToken, message: text });
    const res = await fetch(`${GRAPH_BASE}/${platformCommentId}/comments`, {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || "Failed to send Facebook reply" };
    }
    return { success: true, platformReplyId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Facebook reply failed" };
  }
}

export const facebookService: SocialService = {
  platform: "FACEBOOK",
  isConfigured,
  getAuthUrl,
  exchangeCodeForToken,
  publishPost,
  getAnalytics,
  getComments,
  replyToComment,
};
