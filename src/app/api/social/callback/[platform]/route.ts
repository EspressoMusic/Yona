import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/session";
import { encryptSecret } from "@/lib/crypto";
import { PLATFORM_LIST } from "@/lib/platforms";
import { getSocialService } from "@/services/social";
import type { Platform } from "@prisma/client";

export async function GET(request: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: platformParam } = await params;
  const platform = platformParam.toUpperCase() as Platform;
  const settingsUrl = new URL("/dashboard/settings", request.url);

  if (!PLATFORM_LIST.includes(platform)) {
    settingsUrl.searchParams.set("error", "unknown_platform");
    return NextResponse.redirect(settingsUrl);
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const cookieName = `sp_oauth_${platform}`;
  const raw = request.cookies.get(cookieName)?.value;

  const response = (url: URL) => {
    const res = NextResponse.redirect(url);
    res.cookies.delete(cookieName);
    return res;
  };

  if (oauthError) {
    settingsUrl.searchParams.set("error", "oauth_denied");
    settingsUrl.searchParams.set("platform", platform);
    return response(settingsUrl);
  }

  if (!code || !state || !raw) {
    settingsUrl.searchParams.set("error", "oauth_failed");
    settingsUrl.searchParams.set("platform", platform);
    return response(settingsUrl);
  }

  let stored: { state: string; codeVerifier: string };
  try {
    stored = JSON.parse(raw);
  } catch {
    settingsUrl.searchParams.set("error", "oauth_failed");
    return response(settingsUrl);
  }

  if (state !== stored.state) {
    settingsUrl.searchParams.set("error", "state_mismatch");
    settingsUrl.searchParams.set("platform", platform);
    return response(settingsUrl);
  }

  const service = getSocialService(platform);

  try {
    const tokenResult = await service.exchangeCodeForToken(code, stored.codeVerifier);

    const existing = await prisma.socialAccount.findFirst({ where: { userId, platform } });
    const data = {
      accountName: tokenResult.accountName || `${platform.charAt(0)}${platform.slice(1).toLowerCase()} account`,
      accountId: tokenResult.accountId ?? null,
      accessTokenEncrypted: encryptSecret(tokenResult.accessToken),
      refreshTokenEncrypted: tokenResult.refreshToken ? encryptSecret(tokenResult.refreshToken) : null,
      tokenExpiresAt: tokenResult.expiresAt ?? null,
      status: "CONNECTED" as const,
      errorMessage: null,
      connectedAt: new Date(),
      disconnectedAt: null,
    };

    if (existing) {
      await prisma.socialAccount.update({ where: { id: existing.id }, data });
    } else {
      await prisma.socialAccount.create({ data: { userId, platform, ...data } });
    }

    settingsUrl.searchParams.set("connected", platform);
    return response(settingsUrl);
  } catch (err) {
    settingsUrl.searchParams.set("error", "oauth_failed");
    settingsUrl.searchParams.set("platform", platform);
    settingsUrl.searchParams.set(
      "message",
      err instanceof Error ? err.message.slice(0, 200) : "Connection failed"
    );
    return response(settingsUrl);
  }
}
