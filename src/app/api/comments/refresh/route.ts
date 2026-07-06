import { NextResponse } from "next/server";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { refreshCommentsForUser } from "@/services/comments";

export async function POST() {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const result = await refreshCommentsForUser(userId);
    return NextResponse.json(result);
  });
}
