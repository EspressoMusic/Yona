import { NextRequest, NextResponse } from "next/server";
import { publishDuePosts } from "@/services/publish";

// Vercel Cron target. Configure in vercel.json:
//   { "crons": [{ "path": "/api/cron/publish-scheduled", "schedule": "*/5 * * * *" }] }
// Vercel automatically sends `Authorization: Bearer ${CRON_SECRET}` for cron
// invocations when CRON_SECRET is set as an env var — verified below so this
// endpoint can't be triggered by anyone who finds the URL.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await publishDuePosts();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron] publish-scheduled failed:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
