import { z } from "zod";

export const PLATFORM_VALUES = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "TWITTER",
  "YOUTUBE",
] as const;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createPostSchema = z
  .object({
    rawCaption: z.string().max(5000).optional().default(""),
    hashtags: z.array(z.string().trim().max(60)).max(50).optional().default([]),
    platforms: z.array(z.enum(PLATFORM_VALUES)).min(1, "Choose at least one platform"),
    mediaIds: z.array(z.string()).max(10).optional().default([]),
    publishNow: z.boolean().optional().default(false),
    scheduledAt: z.string().datetime().optional().nullable(),
    applyDefaultCaption: z.boolean().optional().default(true),
    applyDefaultHashtags: z.boolean().optional().default(true),
  })
  .refine((data) => data.publishNow || !!data.scheduledAt, {
    message: "Choose a schedule date/time or select publish now",
    path: ["scheduledAt"],
  });

export const updatePostSchema = z.object({
  rawCaption: z.string().max(5000).optional(),
  hashtags: z.array(z.string().trim().max(60)).max(50).optional(),
  platforms: z.array(z.enum(PLATFORM_VALUES)).min(1).optional(),
  mediaIds: z.array(z.string()).max(10).optional(),
  publishNow: z.boolean().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

export const settingsSchema = z.object({
  theme: z.enum(["LIGHT", "DARK", "SYSTEM", "WARM"]).optional(),
  defaultCaption: z.string().max(2000).optional().nullable(),
  defaultHashtags: z.array(z.string().trim().max(60)).max(50).optional(),
});

export const connectAccountSchema = z.object({
  platform: z.enum(PLATFORM_VALUES),
  accountName: z.string().trim().min(1).max(200),
});

export const replySchema = z.object({
  commentId: z.string().min(1),
  text: z.string().trim().min(1, "Reply cannot be empty").max(2000),
});
