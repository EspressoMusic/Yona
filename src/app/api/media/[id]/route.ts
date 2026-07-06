import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { deleteUploadedFile } from "@/lib/storage";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { id } = await params;

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media || media.userId !== userId) {
      throw new ApiError("Media not found", 404);
    }
    if (media.postId) {
      throw new ApiError("This media is already attached to a post", 409);
    }

    await prisma.media.delete({ where: { id } });
    await deleteUploadedFile(media.url);

    return NextResponse.json({ success: true });
  });
}
