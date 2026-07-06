import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { updatePostSchema } from "@/lib/validation";
import { composePost } from "@/lib/post-compose";

const EDITABLE_STATUSES = ["DRAFT", "SCHEDULED", "FAILED"];

async function loadOwnedPost(id: string, userId: string) {
  const post = await prisma.post.findUnique({ where: { id }, include: { media: true, platformPosts: true } });
  if (!post || post.userId !== userId) {
    throw new ApiError("Post not found", 404);
  }
  return post;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { id } = await params;
    const post = await loadOwnedPost(id, userId);
    return NextResponse.json({ post });
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { id } = await params;
    const existing = await loadOwnedPost(id, userId);

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new ApiError("Only draft, scheduled, or failed posts can be edited", 409);
    }

    const body = await request.json();
    const input = updatePostSchema.parse(body);

    if (input.mediaIds) {
      const ownedCount = await prisma.media.count({ where: { id: { in: input.mediaIds }, userId } });
      if (ownedCount !== input.mediaIds.length) {
        throw new ApiError("One or more media files were not found", 400);
      }
    }

    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const rawCaption = input.rawCaption ?? existing.rawCaption ?? "";
    const hashtags = input.hashtags ?? existing.hashtags;

    const { caption, hashtags: finalHashtags } = composePost({
      rawCaption,
      hashtags,
      defaultCaption: settings?.defaultCaption,
      defaultHashtags: settings?.defaultHashtags,
      applyDefaultCaption: false,
      applyDefaultHashtags: false,
    });

    const scheduledAt =
      input.scheduledAt !== undefined
        ? input.scheduledAt
          ? new Date(input.scheduledAt)
          : null
        : existing.scheduledAt;
    const publishNow = input.publishNow ?? existing.publishNow;
    const status = publishNow ? "PUBLISHING" : scheduledAt ? "SCHEDULED" : "DRAFT";

    if (input.platforms) {
      await prisma.postPlatform.deleteMany({ where: { postId: id } });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        rawCaption,
        caption,
        hashtags: finalHashtags,
        scheduledAt,
        publishNow,
        status,
        media: input.mediaIds ? { set: input.mediaIds.map((mid) => ({ id: mid })) } : undefined,
        platformPosts: input.platforms
          ? {
              create: input.platforms.map((platform) => ({
                platform,
                status: "SCHEDULED",
              })),
            }
          : undefined,
      },
      include: { media: true, platformPosts: true },
    });

    return NextResponse.json({ post: updated });
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { id } = await params;
    const existing = await loadOwnedPost(id, userId);

    if (!EDITABLE_STATUSES.includes(existing.status)) {
      throw new ApiError("Only draft, scheduled, or failed posts can be deleted", 409);
    }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ success: true });
  });
}
