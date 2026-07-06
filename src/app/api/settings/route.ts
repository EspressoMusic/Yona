import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { settingsSchema } from "@/lib/validation";

export async function GET() {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return NextResponse.json({ settings });
  });
}

export async function PATCH(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const body = await request.json();
    const input = settingsSchema.parse(body);

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: input,
      create: { userId, ...input },
    });

    return NextResponse.json({ settings });
  });
}
