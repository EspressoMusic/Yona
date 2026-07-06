import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { PLATFORM_LIST } from "@/lib/platforms";
import type { Platform } from "@prisma/client";

export async function GET(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const platformParam = request.nextUrl.searchParams.get("platform");
    const postId = request.nextUrl.searchParams.get("postId");

    const platform =
      platformParam && PLATFORM_LIST.includes(platformParam.toUpperCase() as Platform)
        ? (platformParam.toUpperCase() as Platform)
        : undefined;

    const comments = await prisma.comment.findMany({
      where: {
        userId,
        ...(platform ? { platform } : {}),
        ...(postId ? { postPlatform: { postId } } : {}),
      },
      include: {
        replies: { orderBy: { createdAt: "asc" } },
        postPlatform: { include: { post: { select: { id: true, caption: true } } } },
      },
      orderBy: { postedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ comments });
  });
}
