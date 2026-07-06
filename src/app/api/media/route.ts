import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { saveUploadedFile, ALLOWED_IMAGE_TYPES } from "@/lib/storage";

export async function GET() {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const media = await prisma.media.findMany({
      where: { userId, postId: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ media });
  });
}

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError("No file was uploaded", 400);
    }

    const saved = await saveUploadedFile(file).catch((err) => {
      throw new ApiError(err instanceof Error ? err.message : "Upload failed", 400);
    });

    const media = await prisma.media.create({
      data: {
        userId,
        type: ALLOWED_IMAGE_TYPES.includes(saved.mimeType) ? "IMAGE" : "VIDEO",
        url: saved.url,
        filename: saved.filename,
        mimeType: saved.mimeType,
        size: saved.size,
      },
    });

    return NextResponse.json({ media });
  });
}
