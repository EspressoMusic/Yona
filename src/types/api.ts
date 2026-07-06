// Plain client-side shapes mirroring our API JSON responses. Kept separate
// from the Prisma-generated types so client components never import the
// Prisma runtime, and because dates arrive as ISO strings over JSON.

export type Platform = "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE";

export type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "PARTIAL";
export type PlatformPostStatus = "PENDING" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";
export type ReplyStatus = "PENDING" | "SENT" | "FAILED";
export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM" | "WARM";

export interface MediaItem {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface PostPlatformItem {
  id: string;
  platform: Platform;
  status: PlatformPostStatus;
  platformPostId: string | null;
  platformUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
}

export interface PostItem {
  id: string;
  rawCaption: string | null;
  caption: string;
  hashtags: string[];
  status: PostStatus;
  publishNow: boolean;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: MediaItem[];
  platformPosts: PostPlatformItem[];
}

export interface UserSettingsItem {
  id: string;
  theme: ThemePreference;
  defaultCaption: string | null;
  defaultHashtags: string[];
}

export interface SocialAccountStatusItem {
  platform: Platform;
  configured: boolean;
  connected: boolean;
  accountName: string | null;
  connectedAt: string | null;
  errorMessage: string | null;
}

export interface CommentReplyItem {
  id: string;
  text: string;
  status: ReplyStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface CommentItem {
  id: string;
  platform: Platform;
  authorName: string;
  authorHandle: string | null;
  text: string;
  likeCount: number | null;
  postedAt: string;
  replies: CommentReplyItem[];
  postPlatform: { post: { id: string; caption: string } } | null;
}

export interface CalendarDay {
  date: string;
  scheduledPosts: { id: string; caption: string }[];
  publishedPosts: { id: string; caption: string }[];
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  growthVsPrevDay: number | null;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
  engagementGrowth: number;
  bestPost: { postId: string; caption: string; views: number } | null;
  bestPlatform: { platform: Platform; views: number } | null;
}
