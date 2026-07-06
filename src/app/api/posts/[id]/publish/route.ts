import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, requireApiUser, withApiErrorHandling } from "@/lib/api-utils";
import { publishPost } from "@/services/publish";

// Manually triggers publishing for a single post — used for "Publish now"
// on a draft, or "Retry" on a failed post.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrorHandling(async () => {
    const userId = await requireApiUser();
    const { id } = await params;

    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.userId !== userId) {
      throw new ApiError("Post not found", 404);
    }
    if (post.status === "PUBLISHED") {
      throw new ApiError("This post has already been published", 409);
    }

    await publishPost(id);

    const fresh = await prisma.post.findUnique({
      where: { id },
      include: { media: true, platformPosts: true },
    });

    return NextResponse.json({ post: fresh });
  });
}
