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

// Instagram publishing runs through the Instagram Graph API, which is
// authenticated via Facebook Login for Business (a connected Instagram
// Business/Creator account behind a Facebook Page).
//
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
//
// Required env vars:
//   INSTAGRAM_APP_ID
//   INSTAGRAM_APP_SECRET
//   INSTAGRAM_REDIRECT_URI

const GRAPH_VERSION = "v19.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function isConfigured(): boolean {
  return Boolean(
    process.env.INSTAGRAM_APP_ID &&
      process.env.INSTAGRAM_APP_SECRET &&
      process.env.INSTAGRAM_REDIRECT_URI
  );
}

function getAuthUrl(state: string): string | null {
  if (!isConfigured()) return null;
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    state,
    scope: "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement",
    response_type: "code",
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  if (!isConfigured()) {
    throw new Error("Instagram is not configured. Set INSTAGRAM_APP_ID/SECRET/REDIRECT_URI.");
  }
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
    code,
  });
  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Failed to exchange Instagram OAuth code");
  }

  // TODO: after getting the user token, call /me/accounts to find the Page,
  // then {page-id}?fields=instagram_business_account to resolve the IG
  // business account id. Storing the raw user token here as a starting point.
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
    return { success: false, error: "Instagram is not configured on this server." };
  }
  if (!account.accessToken || !account.accountId) {
    return { success: false, error: "Instagram account is not fully connected." };
  }
  const media = content.media[0];
  if (!media) {
    return { success: false, error: "Instagram requires at least one image or video." };
  }

  try {
    // Step 1: create a media container.
    const containerParams = new URLSearchParams({
      access_token: account.accessToken,
      caption: [content.caption, ...content.hashtags].join(" ").trim(),
      ...(media.type === "IMAGE" ? { image_url: media.url } : { video_url: media.url, media_type: "REELS" }),
    });
    const containerRes = await fetch(`${GRAPH_BASE}/${account.accountId}/media`, {
      method: "POST",
      body: containerParams,
    });
    const containerData = await containerRes.json();
    if (!containerRes.ok) {
      return { success: false, error: containerData?.error?.message || "Failed to create media container" };
    }

    // Step 2: publish the container.
    const publishParams = new URLSearchParams({
      access_token: account.accessToken,
      creation_id: containerData.id,
    });
    const publishRes = await fetch(`${GRAPH_BASE}/${account.accountId}/media_publish`, {
      method: "POST",
      body: publishParams,
    });
    const publishData = await publishRes.json();
    if (!publishRes.ok) {
      return { success: false, error: publishData?.error?.message || "Failed to publish to Instagram" };
    }

    return {
      success: true,
      platformPostId: publishData.id,
      platformUrl: `https://www.instagram.com/p/${publishData.id}/`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Instagram publish failed" };
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
      metric: "impressions,reach,likes,comments,shares",
    });
    const res = await fetch(`${GRAPH_BASE}/${platformPostId}/insights?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) return NOT_CONFIGURED_ANALYTICS;

    const byName: Record<string, number> = {};
    for (const entry of data.data ?? []) {
      byName[entry.name] = entry.values?.[0]?.value ?? 0;
    }
    return {
      views: byName.impressions ?? byName.reach ?? 0,
      likes: byName.likes ?? 0,
      comments: byName.comments ?? 0,
      shares: byName.shares ?? 0,
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
      fields: "id,username,text,timestamp,like_count",
    });
    const res = await fetch(`${GRAPH_BASE}/${platformPostId}/comments?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) return [];
    return (data.data ?? []).map(
      (c: { id: string; username?: string; text: string; timestamp: string; like_count?: number }) => ({
        platformCommentId: c.id,
        authorName: c.username || "Instagram user",
        authorHandle: c.username,
        text: c.text,
        likeCount: c.like_count,
        postedAt: new Date(c.timestamp),
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
    return { success: false, error: "Instagram is not connected." };
  }
  try {
    const params = new URLSearchParams({ access_token: account.accessToken, message: text });
    const res = await fetch(`${GRAPH_BASE}/${platformCommentId}/replies`, {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || "Failed to send Instagram reply" };
    }
    return { success: true, platformReplyId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Instagram reply failed" };
  }
}

export const instagramService: SocialService = {
  platform: "INSTAGRAM",
  isConfigured,
  getAuthUrl,
  exchangeCodeForToken,
  publishPost,
  getAnalytics,
  getComments,
  replyToComment,
};
