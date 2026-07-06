import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";

function monthRange(monthParam: string | null) {
  const now = new Date();
  const [year, month] = (monthParam || `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`)
    .split("-")
    .map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const prevStart = new Date(Date.UTC(year, month - 2, 1));
  const prevEnd = start;
  return { start, end, prevStart, prevEnd };
}

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { start, end, prevStart, prevEnd } = monthRange(request.nextUrl.searchParams.get("month"));

    const [rows, prevRows] = await Promise.all([
      prisma.analytics.findMany({
        where: { date: { gte: start, lt: end }, postPlatform: { post: { userId } } },
        include: { postPlatform: { include: { post: true } } },
      }),
      prisma.analytics.findMany({
        where: { date: { gte: prevStart, lt: prevEnd }, postPlatform: { post: { userId } } },
      }),
    ]);

    const totalViews = rows.reduce((sum, r) => sum + r.views, 0);
    const totalComments = rows.reduce((sum, r) => sum + r.comments, 0);
    const totalLikes = rows.reduce((sum, r) => sum + r.likes, 0);
    const totalShares = rows.reduce((sum, r) => sum + r.shares, 0);

    const thisMonthEngagement = totalLikes + totalComments + totalShares;
    const prevMonthEngagement = prevRows.reduce((sum, r) => sum + r.likes + r.comments + r.shares, 0);
    const engagementGrowth =
      prevMonthEngagement > 0
        ? ((thisMonthEngagement - prevMonthEngagement) / prevMonthEngagement) * 100
        : thisMonthEngagement > 0
          ? 100
          : 0;

    const byPost = new Map<string, { postId: string; caption: string; views: number }>();
    const byPlatform = new Map<string, number>();

    for (const row of rows) {
      const postId = row.postPlatform.postId;
      const existing = byPost.get(postId);
      byPost.set(postId, {
        postId,
        caption: row.postPlatform.post.caption,
        views: (existing?.views ?? 0) + row.views,
      });
      byPlatform.set(row.platform, (byPlatform.get(row.platform) ?? 0) + row.views);
    }

    const bestPost = [...byPost.values()].sort((a, b) => b.views - a.views)[0] ?? null;
    const bestPlatformEntry = [...byPlatform.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

    return NextResponse.json({
      totalViews,
      totalComments,
      totalLikes,
      totalShares,
      engagementGrowth: Math.round(engagementGrowth * 10) / 10,
      bestPost,
      bestPlatform: bestPlatformEntry ? { platform: bestPlatformEntry[0], views: bestPlatformEntry[1] } : null,
    });
  });
}
