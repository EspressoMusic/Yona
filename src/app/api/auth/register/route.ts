import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/lib/validation";
import { ApiError, withApiErrorHandling } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  return withApiErrorHandling(async () => {
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        settings: { create: {} },
      },
    });

    const token = await createSessionToken({ userId: user.id, email: user.email });
    await setSessionCookie(token);

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  });
}
