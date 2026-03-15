import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";

import { db } from "~/server/db";
import { userLinks } from "~/server/db/schema";

export async function createNewUserLink(userId?: string | null) {
  const [userLink] = await db
    .insert(userLinks)
    .values({ userId: userId ?? null })
    .returning();
  return userLink;
}

export async function getUserLinkById(id: string) {
  return db.query.userLinks.findFirst({
    where: eq(userLinks.id, id),
    with: { links: true },
  });
}

export async function getUserLinkByUserId(userId: string) {
  return db.query.userLinks.findFirst({
    where: eq(userLinks.userId, userId),
    with: { links: true },
  });
}

export async function getOrCreateUserLinkByUserId(userId: string) {
  const existing = await db.query.userLinks.findFirst({
    where: eq(userLinks.userId, userId),
    with: { links: true },
  });
  if (existing) return existing;
  return createNewUserLink(userId);
}

export async function getOrCreateUserLinkById(id: string) {
  const existing = await db.query.userLinks.findFirst({
    where: eq(userLinks.id, id),
    with: { links: true },
  });
  if (existing) return existing;
  return createNewUserLink();
}

export async function updateUserLink(id: string, data: Partial<typeof userLinks.$inferInsert>) {
  const [updated] = await db
    .update(userLinks)
    .set(data)
    .where(eq(userLinks.id, id))
    .returning();
  return updated;
}

export async function setUserLinkIdCookie(id: string) {
  const cookieStore = await cookies();
  cookieStore.set("user-link-id", id, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteExpiredUserLinks() {
  // Delete anonymous userLinks older than 30 days
  await db
    .delete(userLinks)
    .where(
      sql`${userLinks.userId} IS NULL AND ${userLinks.createdAt} < strftime('%s', 'now', '-30 days')`,
    );
}
