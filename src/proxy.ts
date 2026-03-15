import type { NextRequest } from "next/server";
import { linkMiddleware } from "~/server/middlewares/linkMiddleware";

export default function middleware(request: NextRequest) {
  return linkMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api/|_next/|_proxy/|_static|_vercel|favicon\\.ico|.*\\.xml|.*\\.txt|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|.*\\.webmanifest).*)",
  ],
};
