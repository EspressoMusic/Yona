import { prisma } from "@/lib/prisma";
import { getSocialService, toAccountContext } from "@/services/social";
import type { Platform, PostPlatform } from "@prisma/client";

// Publishes every platform target on a post that hasn't succeeded yet, then
// rolls the per-platform results up into the parent Post's overall status.
// Used both by the "Publish now" path and by the scheduled-posts cron.
export async function publishPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { media: true, platformPosts: true },
  });
  if (!post) return;

  await prisma.post.update({ where: { id: post.id }, data: { status: "PUBLISHING" } });

  const socialAccounts = await prisma.socialAccount.findMany({
    where: { userId: post.userId, status: "CONNECTED" },
  });

  const pending = post.platformPosts.filter(
    (pp) => pp.status !== "PUBLISHED"
  );

  const results = await Promise.all(pending.map((pp) => publishOnePlatform(pp, post, socialAccounts)));

  const allPlatforms = await prisma.postPlatform.findMany({ where: { postId: post.id } });
  const succeeded = allPlatforms.filter((pp) => pp.status === "PUBLISHED").length;
  const failed = allPlatforms.filter((pp) => pp.status === "FAILED").length;

  const overallStatus =
    succeeded === allPlatforms.length
      ? "PUBLISHED"
      : succeeded > 0
        ? "PARTIAL"
        : failed === allPlatforms.length
          ? "FAILED"
          : "PUBLISHING";

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: overallStatus,
      publishedAt: succeeded > 0 ? new Date() : post.publishedAt,
    },
  });

  void results;
}

async function publishOnePlatform(
  postPlatform: PostPlatform,
  post: { id: string; caption: string; hashtags: string[]; media: { url: string; type: string }[] },
  socialAccounts: { id: string; platform: Platform; status: string }[]
) {
  await prisma.postPlatform.update({
    where: { id: postPlatform.id },
    data: { status: "PUBLISHING" },
  });

  const account = socialAccounts.find((a) => a.platform === postPlatform.platform);

  if (!account) {
    const message = `No connected ${postPlatform.platform} account. Connect one in Settings & Connections.`;
    await prisma.postPlatform.update({
      where: { id: postPlatform.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await prisma.publishLog.create({
      data: {
        postId: post.id,
        postPlatformId: postPlatform.id,
        platform: postPlatform.platform,
        status: "FAILURE",
        message,
      },
    });
    return { success: false };
  }

  const fullAccount = await prisma.socialAccount.findUniqueOrThrow({ where: { id: account.id } });
  const service = getSocialService(postPlatform.platform);

  try {
    const result = await service.publishPost(toAccountContext(fullAccount), {
      caption: post.caption,
      hashtags: post.hashtags,
      media: post.media.map((m) => ({ url: m.url, type: m.type as "IMAGE" | "VIDEO" })),
    });

    if (result.success) {
      await prisma.postPlatform.update({
        where: { id: postPlatform.id },
        data: {
          status: "PUBLISHED",
          platformPostId: result.platformPostId,
          platformUrl: result.platformUrl,
          publishedAt: new Date(),
          errorMessage: null,
        },
      });
      await prisma.publishLog.create({
        data: {
          postId: post.id,
          postPlatformId: postPlatform.id,
          platform: postPlatform.platform,
          status: "SUCCESS",
          message: `Published to ${postPlatform.platform}`,
        },
      });
    } else {
      await prisma.postPlatform.update({
        where: { id: postPlatform.id },
        data: { status: "FAILED", errorMessage: result.error },
      });
      await prisma.publishLog.create({
        data: {
          postId: post.id,
          postPlatformId: postPlatform.id,
          platform: postPlatform.platform,
          status: "FAILURE",
          message: result.error || "Publish failed",
        },
      });
    }
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected publish error";
    await prisma.postPlatform.update({
      where: { id: postPlatform.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await prisma.publishLog.create({
      data: {
        postId: post.id,
        postPlatformId: postPlatform.id,
        platform: postPlatform.platform,
        status: "FAILURE",
        message,
      },
    });
    return { success: false, error: message };
  }
}

// Finds every post whose scheduled time has passed and publishes it.
// Called by the Vercel Cron endpoint (and can be invoked manually).
export async function publishDuePosts(): Promise<{ processed: number; postIds: string[] }> {
  const due = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
    select: { id: true },
  });

  for (const post of due) {
    await publishPost(post.id);
  }

  return { processed: due.length, postIds: due.map((p) => p.id) };
}
