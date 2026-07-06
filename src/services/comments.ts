import { prisma } from "@/lib/prisma";
import { getSocialService, toAccountContext } from "@/services/social";

// Pulls new comments for every published post belonging to a user. Platforms
// that aren't connected/configured simply return no comments (see each
// service's getComments placeholder) rather than fabricating any.
export async function refreshCommentsForUser(userId: string): Promise<{ fetched: number }> {
  const postPlatforms = await prisma.postPlatform.findMany({
    where: {
      status: "PUBLISHED",
      platformPostId: { not: null },
      post: { userId },
    },
  });

  const accounts = await prisma.socialAccount.findMany({ where: { userId, status: "CONNECTED" } });
  let fetched = 0;

  for (const pp of postPlatforms) {
    const account = accounts.find((a) => a.platform === pp.platform);
    if (!account || !pp.platformPostId) continue;

    const service = getSocialService(pp.platform);
    const comments = await service.getComments(toAccountContext(account), pp.platformPostId);

    for (const c of comments) {
      await prisma.comment.upsert({
        where: { platformCommentId: c.platformCommentId },
        update: {
          text: c.text,
          likeCount: c.likeCount,
        },
        create: {
          userId,
          socialAccountId: account.id,
          postPlatformId: pp.id,
          platform: pp.platform,
          platformCommentId: c.platformCommentId,
          authorName: c.authorName,
          authorHandle: c.authorHandle,
          text: c.text,
          likeCount: c.likeCount,
          postedAt: c.postedAt,
        },
      });
      fetched += 1;
    }
  }

  return { fetched };
}
