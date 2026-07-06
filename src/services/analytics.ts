import { prisma } from "@/lib/prisma";
import { getSocialService, toAccountContext } from "@/services/social";

function todayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Pulls fresh metrics for every published post belonging to a user and
// stores a snapshot for today. Real numbers only — platforms that aren't
// connected/configured are skipped rather than backfilled with fake data.
export async function refreshAnalyticsForUser(userId: string): Promise<{ updated: number }> {
  const postPlatforms = await prisma.postPlatform.findMany({
    where: {
      status: "PUBLISHED",
      platformPostId: { not: null },
      post: { userId },
    },
  });

  const accounts = await prisma.socialAccount.findMany({ where: { userId, status: "CONNECTED" } });
  const date = todayDateOnly();
  let updated = 0;

  for (const pp of postPlatforms) {
    const account = accounts.find((a) => a.platform === pp.platform);
    if (!account || !pp.platformPostId) continue;

    const service = getSocialService(pp.platform);
    const result = await service.getAnalytics(toAccountContext(account), pp.platformPostId);
    if (result.notConfigured) continue;

    await prisma.analytics.upsert({
      where: { postPlatformId_date: { postPlatformId: pp.id, date } },
      update: { views: result.views, likes: result.likes, comments: result.comments, shares: result.shares },
      create: {
        postPlatformId: pp.id,
        platform: pp.platform,
        date,
        views: result.views,
        likes: result.likes,
        comments: result.comments,
        shares: result.shares,
      },
    });
    updated += 1;
  }

  return { updated };
}
