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

// YouTube Shorts publishing via the YouTube Data API v3 (a Short is just a
// normal upload — vertical, under 60s — there is no separate Shorts endpoint).
// Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
//
// Required env vars:
//   YOUTUBE_CLIENT_ID
//   YOUTUBE_CLIENT_SECRET
//   YOUTUBE_REDIRECT_URI

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/youtube/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3/videos";

function isConfigured(): boolean {
  return Boolean(
    process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET && process.env.YOUTUBE_REDIRECT_URI
  );
}

function getAuthUrl(state: string): string | null {
  if (!isConfigured()) return null;
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    state,
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<TokenExchangeResult> {
  if (!isConfigured()) {
    throw new Error("YouTube is not configured. Set YOUTUBE_CLIENT_ID/SECRET/REDIRECT_URI.");
  }
  const params = new URLSearchParams({
    code,
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description || "Failed to exchange YouTube OAuth code");
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
    return { success: false, error: "YouTube is not configured on this server." };
  }
  if (!account.accessToken) {
    return { success: false, error: "YouTube account is not fully connected." };
  }
  const video = content.media.find((m) => m.type === "VIDEO");
  if (!video) {
    return { success: false, error: "YouTube Shorts require a video file." };
  }

  try {
    const videoBytes = await fetch(video.url).then((r) => r.arrayBuffer());

    const metadata = {
      snippet: {
        title: content.caption.slice(0, 100) || "New Short",
        description: [content.caption, ...content.hashtags].join(" ").trim(),
        tags: content.hashtags.map((h) => h.replace(/^#/, "")),
      },
      status: { privacyStatus: "public" },
    };

    // Simple (non-resumable) multipart upload — fine for the short, small
    // files typical of Shorts. For larger files, switch to the resumable
    // upload protocol documented above.
    const boundary = "spboundary";
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`;
    const closing = `\r\n--${boundary}--`;
    const fullBody = Buffer.concat([
      Buffer.from(body, "utf8"),
      Buffer.from(videoBytes),
      Buffer.from(closing, "utf8"),
    ]);

    const res = await fetch(`${UPLOAD_BASE}?uploadType=multipart&part=snippet,status`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: fullBody,
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || "Failed to upload to YouTube" };
    }
    return {
      success: true,
      platformPostId: data.id,
      platformUrl: `https://youtube.com/shorts/${data.id}`,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "YouTube publish failed" };
  }
}

async function getAnalytics(
  account: SocialAccountContext,
  platformPostId: string
): Promise<AnalyticsResult> {
  if (!isConfigured() || !account.accessToken) return NOT_CONFIGURED_ANALYTICS;
  try {
    const params = new URLSearchParams({ part: "statistics", id: platformPostId });
    const res = await fetch(`${API_BASE}/videos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return NOT_CONFIGURED_ANALYTICS;
    const stats = data.items?.[0]?.statistics;
    if (!stats) return NOT_CONFIGURED_ANALYTICS;
    return {
      views: Number(stats.viewCount ?? 0),
      likes: Number(stats.likeCount ?? 0),
      comments: Number(stats.commentCount ?? 0),
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
      part: "snippet",
      videoId: platformPostId,
      maxResults: "50",
    });
    const res = await fetch(`${API_BASE}/commentThreads?${params.toString()}`, {
      headers: { Authorization: `Bearer ${account.accessToken}` },
    });
    const data = await res.json();
    if (!res.ok) return [];
    return (data.items ?? []).map(
      (item: {
        id: string;
        snippet: {
          topLevelComment: {
            snippet: {
              authorDisplayName: string;
              textDisplay: string;
              likeCount?: number;
              publishedAt: string;
            };
          };
        };
      }) => {
        const c = item.snippet.topLevelComment.snippet;
        return {
          platformCommentId: item.id,
          authorName: c.authorDisplayName,
          text: c.textDisplay,
          likeCount: c.likeCount,
          postedAt: new Date(c.publishedAt),
        };
      }
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
    return { success: false, error: "YouTube is not connected." };
  }
  try {
    const res = await fetch(`${API_BASE}/comments?part=snippet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        snippet: { parentId: platformCommentId, textOriginal: text },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error?.message || "Failed to send YouTube reply" };
    }
    return { success: true, platformReplyId: data.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "YouTube reply failed" };
  }
}

export const youtubeService: SocialService = {
  platform: "YOUTUBE",
  isConfigured,
  getAuthUrl,
  exchangeCodeForToken,
  publishPost,
  getAnalytics,
  getComments,
  replyToComment,
};
