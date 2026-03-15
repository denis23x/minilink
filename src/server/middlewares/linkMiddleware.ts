import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { links } from "~/server/db/schema";
import { redis } from "~/server/redis";

export async function linkMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through home and multi-segment paths
  if (pathname === "/" || pathname.split("/").filter(Boolean).length > 1) {
    return NextResponse.next();
  }

  const slug = pathname.slice(1); // remove leading /
  if (!slug) return NextResponse.next();

  // Primary fast path — Redis lookup
  const encodedUrl = await redis.get<string>(slug.toLowerCase());

  if (encodedUrl) {
    // Fire-and-forget click increment — don't block the redirect
    void db
      .update(links)
      .set({ clicks: sql`${links.clicks} + 1` })
      .where(eq(links.slug, slug))
      .run()
      .catch((err: unknown) => console.error("[linkMiddleware] click increment failed", err));

    return NextResponse.redirect(decodeURIComponent(encodedUrl), { status: 302 });
  }

  return NextResponse.next();
}
