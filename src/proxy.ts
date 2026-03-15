import type { NextFetchEvent, NextRequest } from "next/server";
import { linkMiddleware } from "~/server/middlewares/linkMiddleware";

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  return linkMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_proxy/|_static|_vercel|favicon\\.ico|.*\\.xml|.*\\.txt|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|.*\\.webmanifest).*)",
  ],
};
