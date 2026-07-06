import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { PLATFORM_LIST } from "@/lib/platforms";
import type { Platform } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const body = await request.json();
    const platform = body?.platform as Platform | undefined;

    if (!platform || !PLATFORM_LIST.includes(platform)) {
      throw new ApiError("Unknown platform", 400);
    }

    const account = await prisma.socialAccount.findFirst({ where: { userId, platform } });
    if (!account) {
      throw new ApiError("Account is not connected", 404);
    }

    await prisma.socialAccount.update({
      where: { id: account.id },
      data: {
        status: "DISCONNECTED",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiresAt: null,
        disconnectedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  });
}
