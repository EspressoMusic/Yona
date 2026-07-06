import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/session";
import { PLATFORM_LIST } from "@/lib/platforms";
import { getSocialService } from "@/services/social";
import type { Platform } from "@/generated/prisma/client";

// Starts the OAuth connect flow for a platform. This is a plain browser
// navigation (the user clicks "Connect" and is redirected to the provider),
// so errors redirect back to Settings with a query param instead of JSON.
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

  const service = getSocialService(platform);
  if (!service.isConfigured()) {
    settingsUrl.searchParams.set("error", "not_configured");
    settingsUrl.searchParams.set("platform", platform);
    return NextResponse.redirect(settingsUrl);
  }

  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

  const authUrl = service.getAuthUrl(state, { codeChallenge });
  if (!authUrl) {
    settingsUrl.searchParams.set("error", "not_configured");
    settingsUrl.searchParams.set("platform", platform);
    return NextResponse.redirect(settingsUrl);
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`sp_oauth_${platform}`, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
