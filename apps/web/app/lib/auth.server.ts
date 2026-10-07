import { redirect } from "react-router";

import { createApi } from "./api.server";
import { ApiError, type UserDto } from "./types";

/**
 * Resolve the current user from the httpOnly cookie. Returns `null` for an
 * unauthenticated session; throws for genuine API failures so the admin
 * boundary can surface them instead of looping on the login screen.
 */
export async function getCurrentUser(request: Request): Promise<UserDto | null> {
  const api = createApi(request);
  try {
    return await api.get<UserDto>("/api/auth/me");
  } catch (error) {
    if (error instanceof ApiError) {
      // 401/403 → not authenticated; other API errors are real failures.
      if (error.status === 401 || error.status === 403) {
        return null;
      }
      throw error;
    }
    // Network failure (API down): treat as unauthenticated so the login screen
    // can still render instead of crashing SSR.
    console.error("[auth] /api/auth/me unavailable:", error);
    return null;
  }
}

/** Guard for admin routes. Redirects to the login screen when unauthenticated. */
export async function requireUser(request: Request): Promise<UserDto> {
  const user = await getCurrentUser(request);
  if (!user) {
    const url = new URL(request.url);
    const redirectTo = `${url.pathname}${url.search}`;
    throw redirect(`/admin/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  return user;
}
