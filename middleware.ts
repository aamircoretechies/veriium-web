import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyJobAccessToken } from "@/lib/auth/signed-url";

const INVALID_LINK_URL = "/public?error=invalid_link";

export async function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/j\/([^/]+)$/);
  const jobId = match?.[1];
  const token = request.nextUrl.searchParams.get("token");

  if (!jobId || !token) {
    return NextResponse.redirect(new URL(INVALID_LINK_URL, request.url));
  }

  try {
    await verifyJobAccessToken(jobId, token);
  } catch {
    return NextResponse.redirect(new URL(INVALID_LINK_URL, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/j/:jobId"],
};
