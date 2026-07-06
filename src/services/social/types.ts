import type { Platform } from "@/generated/prisma/client";

// Minimal account shape every service needs. Tokens passed in here are
// already decrypted by the caller (see services/social/index.ts) — service
// implementations never touch encryption directly.
export interface SocialAccountContext {
  id: string;
  accountId: string | null;
  accountName: string;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface MediaInput {
  url: string;
  type: "IMAGE" | "VIDEO";
}

export interface PublishContent {
  caption: string;
  hashtags: string[];
  media: MediaInput[];
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformUrl?: string;
  error?: string;
}

export interface AnalyticsResult {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  // true when the platform isn't connected/configured, so the UI can show
  // "not connected" instead of implying these zeros are real measurements.
  notConfigured?: boolean;
}

export interface PlatformComment {
  platformCommentId: string;
  authorName: string;
  authorHandle?: string;
  text: string;
  likeCount?: number;
  postedAt: Date;
}

export interface ReplyResult {
  success: boolean;
  platformReplyId?: string;
  error?: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  accountId?: string;
  accountName?: string;
}

export interface SocialService {
  platform: Platform;

  // Whether this platform's developer app credentials exist in env vars.
  // Used to decide between "Connect" and "Not configured" in the UI.
  isConfigured(): boolean;

  // Builds the provider's OAuth authorization URL. Returns null when the
  // platform isn't configured. `pkce` is only used by providers that require
  // OAuth2 PKCE (currently X/Twitter) — other providers ignore it.
  getAuthUrl(state: string, pkce?: { codeChallenge: string }): string | null;

  // Exchanges an OAuth `code` (from the callback redirect) for tokens.
  // `codeVerifier` is only needed for PKCE providers (X/Twitter).
  exchangeCodeForToken(code: string, codeVerifier?: string): Promise<TokenExchangeResult>;

  publishPost(account: SocialAccountContext, content: PublishContent): Promise<PublishResult>;
  getAnalytics(account: SocialAccountContext, platformPostId: string): Promise<AnalyticsResult>;
  getComments(account: SocialAccountContext, platformPostId: string): Promise<PlatformComment[]>;
  replyToComment(
    account: SocialAccountContext,
    platformCommentId: string,
    text: string
  ): Promise<ReplyResult>;
}

export const NOT_CONFIGURED_ANALYTICS: AnalyticsResult = {
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  notConfigured: true,
};
