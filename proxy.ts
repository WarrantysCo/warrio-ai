import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminAuthRequired, isAdminAllowed } from "@/app/lib/adminAuth";

// Protects every /admin page (not just the API routes) with the same
// Basic Auth password, so pages like /admin/warranty need no auth code of
// their own.
export function proxy(request: NextRequest) {
  if (!isAdminAllowed(request)) return adminAuthRequired();
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
