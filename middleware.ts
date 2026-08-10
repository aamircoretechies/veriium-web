import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyJobAccessToken } from "@/lib/auth/signed-url";

const DRIVER_INVALID_LINK_URL = "/public?error=invalid_link";
const MECHANIC_INVALID_LINK_URL = "/m/signin?error=invalid_link";

export async function middleware(request: NextRequest) {
  const driverMatch = request.nextUrl.pathname.match(/^\/j\/([^/]+)$/);
  const mechanicMatch = request.nextUrl.pathname.match(/^\/m\/job\/([^/]+)$/);
  const jobId = driverMatch?.[1] ?? mechanicMatch?.[1];
  const token = request.nextUrl.searchParams.get("token");
  const isMechanicJobRoute = Boolean(mechanicMatch);

  if (!jobId) {
    return NextResponse.next();
  }

  if (isMechanicJobRoute) {
    if (!token) {
      return NextResponse.next();
    }
  } else if (!token) {
    return NextResponse.redirect(
      new URL(DRIVER_INVALID_LINK_URL, request.url),
    );
  }

  try {
    await verifyJobAccessToken(jobId, token!);
  } catch {
    const redirectUrl = isMechanicJobRoute
      ? MECHANIC_INVALID_LINK_URL
      : DRIVER_INVALID_LINK_URL;
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/j/:jobId", "/m/job/:jobId"],
};
