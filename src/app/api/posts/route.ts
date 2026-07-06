import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { createPostSchema } from "@/lib/validation";
import { composePost } from "@/lib/post-compose";
import { publishPost } from "@/services/publish";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const status = request.nextUrl.searchParams.get("status");

    const posts = await prisma.post.findMany({
      where: { userId, ...(status ? { status: status as never } : {}) },
      include: { media: true, platformPosts: true },
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ posts });
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const body = await request.json();
    const input = createPostSchema.parse(body);

    const settings = await prisma.userSettings.findUnique({ where: { userId } });

    const { caption, hashtags } = composePost({
      rawCaption: input.rawCaption,
      hashtags: input.hashtags,
      defaultCaption: settings?.defaultCaption,
      defaultHashtags: settings?.defaultHashtags,
      applyDefaultCaption: input.applyDefaultCaption,
      applyDefaultHashtags: input.applyDefaultHashtags,
    });

    if (input.mediaIds.length) {
      const ownedCount = await prisma.media.count({ where: { id: { in: input.mediaIds }, userId } });
      if (ownedCount !== input.mediaIds.length) {
        throw new ApiError("One or more media files were not found", 400);
      }
    }

    const status = input.publishNow ? "PUBLISHING" : input.scheduledAt ? "SCHEDULED" : "DRAFT";

    const post = await prisma.post.create({
      data: {
        userId,
        rawCaption: input.rawCaption,
        caption,
        hashtags,
        status,
        publishNow: input.publishNow,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        media: input.mediaIds.length ? { connect: input.mediaIds.map((id) => ({ id })) } : undefined,
        platformPosts: {
          create: input.platforms.map((platform) => ({
            platform,
            status: input.publishNow ? "PUBLISHING" : "SCHEDULED",
          })),
        },
      },
      include: { media: true, platformPosts: true },
    });

    if (input.publishNow) {
      await publishPost(post.id);
    }

    const fresh = await prisma.post.findUnique({
      where: { id: post.id },
      include: { media: true, platformPosts: true },
    });

    return NextResponse.json({ post: fresh });
  });
}
