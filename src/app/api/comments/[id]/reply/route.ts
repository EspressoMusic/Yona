import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { replySchema } from "@/lib/validation";
import { getSocialService, toAccountContext } from "@/services/social";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { id } = await params;
    const body = await request.json();
    const { text } = replySchema.omit({ commentId: true }).parse(body);

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { socialAccount: true },
    });
    if (!comment || comment.userId !== userId) {
      throw new ApiError("Comment not found", 404);
    }

    const reply = await prisma.commentReply.create({
      data: { commentId: comment.id, userId, text, status: "PENDING" },
    });

    const service = getSocialService(comment.platform);
    const result = await service.replyToComment(
      toAccountContext(comment.socialAccount),
      comment.platformCommentId,
      text
    );

    const updated = await prisma.commentReply.update({
      where: { id: reply.id },
      data: result.success
        ? { status: "SENT", platformReplyId: result.platformReplyId }
        : { status: "FAILED", errorMessage: result.error },
    });

    return NextResponse.json({ reply: updated });
  });
}
