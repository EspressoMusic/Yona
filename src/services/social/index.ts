import type { Platform, SocialAccount } from "@/generated/prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { instagramService } from "./instagram";
import { facebookService } from "./facebook";
import { tiktokService } from "./tiktok";
import { linkedinService } from "./linkedin";
import { twitterService } from "./twitter";
import { youtubeService } from "./youtube";
import type { SocialAccountContext, SocialService } from "./types";

export const socialServices: Record<Platform, SocialService> = {
  INSTAGRAM: instagramService,
  FACEBOOK: facebookService,
  TIKTOK: tiktokService,
  LINKEDIN: linkedinService,
  TWITTER: twitterService,
  YOUTUBE: youtubeService,
};

export function getSocialService(platform: Platform): SocialService {
  return socialServices[platform];
}

// Decrypts the stored tokens on a SocialAccount row into the plain shape
// each service implementation expects. Never send the result to the client.
export function toAccountContext(account: SocialAccount): SocialAccountContext {
  return {
    id: account.id,
    accountId: account.accountId,
    accountName: account.accountName,
    accessToken: account.accessTokenEncrypted ? decryptSecret(account.accessTokenEncrypted) : null,
    refreshToken: account.refreshTokenEncrypted ? decryptSecret(account.refreshTokenEncrypted) : null,
  };
}

export * from "./types";
