import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validation";
import { ApiError, withApiErrorHandling } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new ApiError("Invalid email or password", 401);
    }
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError("Invalid email or password", 401);
    }

    const token = await createSessionToken({ userId: user.id, email: user.email });
    await setSessionCookie(token);

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  });
}
