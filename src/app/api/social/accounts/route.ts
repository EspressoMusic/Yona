import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { PLATFORM_LIST } from "@/lib/platforms";
import { getSocialService } from "@/services/social";

export async function GET() {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const accounts = await prisma.socialAccount.findMany({ where: { userId } });

    const byPlatform = PLATFORM_LIST.map((platform) => {
      const account = accounts.find((a) => a.platform === platform);
      return {
        platform,
        configured: getSocialService(platform).isConfigured(),
        connected: account?.status === "CONNECTED",
        accountName: account?.accountName ?? null,
        connectedAt: account?.connectedAt ?? null,
        errorMessage: account?.status === "ERROR" ? account.errorMessage : null,
      };
    });

    return NextResponse.json({ accounts: byPlatform });
  });
}
