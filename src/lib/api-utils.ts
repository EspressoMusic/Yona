import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getAuthenticatedUserId } from "@/lib/session";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireApiUser(): Promise<string> {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    throw new ApiError("Not authenticated", 401);
  }
  return userId;
}

// Wraps a route handler with consistent error handling: Zod validation errors
// become 400s with field messages, ApiError carries its own status, anything
// else is logged and returned as a generic 500.
export function withApiErrorHandling<T>(handler: () => Promise<T>) {
  return handler().catch((err) => {
    if (err instanceof ApiError) {
      return jsonError(err.message, err.status);
    }
    if (err instanceof ZodError) {
      const message = err.issues.map((i) => i.message).join(", ");
      return jsonError(message, 400);
    }
    console.error("[api] unhandled error:", err);
    return jsonError("Something went wrong. Please try again.", 500);
  });
}
