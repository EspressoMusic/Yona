import type { Platform } from "@/generated/prisma/client";

export const PLATFORM_LIST: Platform[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "TWITTER",
  "YOUTUBE",
];

export const PLATFORM_META: Record<
  Platform,
  { label: string; color: string; bg: string; border: string }
> = {
  INSTAGRAM: {
    label: "Instagram",
    color: "text-pink-600 dark:text-pink-400",
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-900",
  },
  FACEBOOK: {
    label: "Facebook",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900",
  },
  TIKTOK: {
    label: "TikTok",
    color: "text-slate-800 dark:text-slate-200",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-300 dark:border-slate-700",
  },
  LINKEDIN: {
    label: "LinkedIn",
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-950/40",
    border: "border-sky-200 dark:border-sky-900",
  },
  TWITTER: {
    label: "X / Twitter",
    color: "text-neutral-900 dark:text-neutral-100",
    bg: "bg-neutral-100 dark:bg-neutral-800/60",
    border: "border-neutral-300 dark:border-neutral-700",
  },
  YOUTUBE: {
    label: "YouTube Shorts",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-900",
  },
};
