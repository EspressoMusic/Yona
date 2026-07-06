import { NextResponse } from "next/server";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { refreshAnalyticsForUser } from "@/services/analytics";

export async function POST() {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const result = await refreshAnalyticsForUser(userId);
    return NextResponse.json(result);
  });
}
