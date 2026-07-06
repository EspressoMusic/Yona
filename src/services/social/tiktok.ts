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

// TikTok Content Posting API (video only — TikTok has no still-image feed
// post endpoint for standard apps).
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
//
// Required env vars:
//   TIKTOK_CLIENT_KEY
//   TIKTOK_CLIENT_SECRET
//   TIKTOK_REDIRECT_URI

const API_BASE = "https://open.tiktokapis.com/v2";

function isConfigured(): boolean {
  return Boolean(
    process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET && process.env.TIKTOK_REDIRECT_URI
  );
}

function getAuthUrl(state: string): string | null {
  if (!isConfigured()) return null;
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    state,
    scope: "user.info.basic,video.publish,video.list",
    response_type: "code",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  if (!isConfigured()) {
    throw new Error("TikTok is not configured. Set TIKTOK_CLIENT_KEY/SECRET/REDIRECT_URI.");
  }
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
  });
  const res = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data?.error_description || data?.error || "Failed to exchange TikTok OAuth code");
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    accountId: data.open_id,
  };
}

async function publishPost(
  account: SocialAccountContext,
  content: PublishContent
): Promise<PublishResult> {
  if (!isConfigured()) {
    return { success: false, error: "TikTok is not configured on this server." };
  }
  if (!account.accessToken) {
    return { success: false, error: "TikTok account is not fully connected." };
  }
  const video = content.media.find((m) => m.type === "VIDEO");
  if (!video) {
    return { success: false, error: "TikTok posts require a video file." };
  }

  try {
    // Step 1: initialize the post with a PULL_FROM_URL source (our stored
    // media must be publicly reachable over HTTPS for TikTok to fetch it).
    const initRes = await fetch(`${API_BASE}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: [content.caption, ...content.hashtags].join(" ").trim(),
          privacy_level: "SELF_ONLY",
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: video.url,
        },
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || initData.error?.code !== "ok") {
      return {
        success: false,
        error: initData?.error?.message || "Failed to initialize TikTok upload",
      };
    }

    return {
      success: true,
      platformPostId: initData.data?.publish_id,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "TikTok publish failed" };
  }
}

async function getAnalytics(
  account: SocialAccountContext,
  platformPostId: string
): Promise<AnalyticsResult> {
  if (!isConfigured() || !account.accessToken) return NOT_CONFIGURED_ANALYTICS;
  try {
    const res = await fetch(`${API_BASE}/video/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { video_ids: [platformPostId] },
        fields: ["like_count", "comment_count", "share_count", "view_count"],
      }),
    });
    const data = await res.json();
    if (!res.ok) return NOT_CONFIGURED_ANALYTICS;
    const video = data.data?.videos?.[0];
    if (!video) return NOT_CONFIGURED_ANALYTICS;
    return {
      views: video.view_count ?? 0,
      likes: video.like_count ?? 0,
      comments: video.comment_count ?? 0,
      shares: video.share_count ?? 0,
    };
  } catch {
    return NOT_CONFIGURED_ANALYTICS;
  }
}

async function getComments(): Promise<PlatformComment[]> {
  // TODO: TikTok's public comment-management endpoints require additional
  // approved scopes (business accounts only as of this writing). Once
  // approved, call the video comment list endpoint here and map results.
  return [];
}

async function replyToComment(): Promise<ReplyResult> {
  return {
    success: false,
    error: "TikTok comment replies require an approved business API scope. Not yet available.",
  };
}

export const tiktokService: SocialService = {
  platform: "TIKTOK",
  isConfigured,
  getAuthUrl,
  exchangeCodeForToken,
  publishPost,
  getAnalytics,
  getComments,
  replyToComment,
};
