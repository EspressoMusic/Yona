import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const monthParam = request.nextUrl.searchParams.get("month");
    const now = new Date();
    const [year, month] = (monthParam || `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`)
      .split("-")
      .map(Number);

    const rangeStart = new Date(Date.UTC(year, month - 1, 1));
    const rangeEnd = new Date(Date.UTC(year, month, 1));
    // Include one extra day before the range so "growth vs previous day" has
    // a baseline even on the 1st of the month.
    const analyticsStart = new Date(Date.UTC(year, month - 1, 0));

    const [scheduled, published, analytics] = await Promise.all([
      prisma.post.findMany({
        where: {
          userId,
          status: "SCHEDULED",
          scheduledAt: { gte: rangeStart, lt: rangeEnd },
        },
        select: { id: true, caption: true, scheduledAt: true },
      }),
      prisma.post.findMany({
        where: {
          userId,
          publishedAt: { gte: rangeStart, lt: rangeEnd },
        },
        select: { id: true, caption: true, publishedAt: true },
      }),
      prisma.analytics.findMany({
        where: { date: { gte: analyticsStart, lt: rangeEnd }, postPlatform: { post: { userId } } },
      }),
    ]);

    const dayTotals = new Map<
      string,
      { views: number; likes: number; comments: number; shares: number }
    >();
    for (const row of analytics) {
      const key = dayKey(row.date);
      const existing = dayTotals.get(key) ?? { views: 0, likes: 0, comments: 0, shares: 0 };
      dayTotals.set(key, {
        views: existing.views + row.views,
        likes: existing.likes + row.likes,
        comments: existing.comments + row.comments,
        shares: existing.shares + row.shares,
      });
    }

    const days: Record<
      string,
      {
        date: string;
        scheduledPosts: { id: string; caption: string }[];
        publishedPosts: { id: string; caption: string }[];
        totalViews: number;
        totalLikes: number;
        totalComments: number;
        totalShares: number;
        growthVsPrevDay: number | null;
      }
    > = {};

    for (let d = new Date(rangeStart); d < rangeEnd; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = dayKey(d);
      const totals = dayTotals.get(key) ?? { views: 0, likes: 0, comments: 0, shares: 0 };
      const prevDay = new Date(d);
      prevDay.setUTCDate(prevDay.getUTCDate() - 1);
      const prevTotals = dayTotals.get(dayKey(prevDay));
      const growthVsPrevDay =
        prevTotals && prevTotals.views > 0
          ? Math.round(((totals.views - prevTotals.views) / prevTotals.views) * 1000) / 10
          : null;

      days[key] = {
        date: key,
        scheduledPosts: [],
        publishedPosts: [],
        totalViews: totals.views,
        totalLikes: totals.likes,
        totalComments: totals.comments,
        totalShares: totals.shares,
        growthVsPrevDay,
      };
    }

    for (const post of scheduled) {
      if (!post.scheduledAt) continue;
      const key = dayKey(post.scheduledAt);
      days[key]?.scheduledPosts.push({ id: post.id, caption: post.caption });
    }
    for (const post of published) {
      if (!post.publishedAt) continue;
      const key = dayKey(post.publishedAt);
      days[key]?.publishedPosts.push({ id: post.id, caption: post.caption });
    }

    return NextResponse.json({ days: Object.values(days) });
  });
}
