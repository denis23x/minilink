import { revalidatePath } from "next/cache";
import { db } from "~/server/db";
import { links, userLinks } from "~/server/db/schema";
import { redis } from "~/server/redis";
import type { ShortLink } from "~/types";
import { eq, gt, isNull, sql } from "drizzle-orm";
import { GUEST_LINK_EXPIRE_TIME } from "~/lib/config";
import { nanoid } from "~/lib/utils";

export async function generateRandomSlug(): Promise<string> {
  const slug = nanoid();
  const exists = await checkSlugExists(slug);
  if (exists) return generateRandomSlug();
  return slug;
}

export async function checkSlugExists(slug: string): Promise<boolean> {
  const result = await redis.exists(slug.toLowerCase());
  return result === 1;
}

export async function getLinkBySlug(slug: string) {
  return db.query.links.findFirst({
    where: sql`${links.slug} = ${slug} COLLATE NOCASE`,
    with: { userLink: true },
  });
}

export async function getLinksByUserLinkId(
  userLinkId: string,
): Promise<ShortLink[]> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return db.query.links.findMany({
    where: (l, { and, eq }) =>
      and(eq(l.userLinkId, userLinkId), gt(l.createdAt, oneDayAgo)),
  });
}

export async function generateShortLink({
  userLinkId,
  slug,
  url,
  description,
  isGuestUser,
}: {
  userLinkId: string;
  slug: string;
  url: string;
  description?: string;
  isGuestUser: boolean;
}) {
  const encodedUrl = encodeURIComponent(url);
  const redisOptions = isGuestUser ? { ex: GUEST_LINK_EXPIRE_TIME } : undefined;

  await Promise.all([
    db
      .insert(links)
      .values({ slug, url: encodedUrl, userLinkId, description })
      .run(),
    db
      .update(userLinks)
      .set({ totalLinks: sql`${userLinks.totalLinks} + 1` })
      .where(eq(userLinks.id, userLinkId))
      .run(),
    redis.set(slug.toLowerCase(), encodedUrl, redisOptions),
  ]);
}

export async function deleteLink(slug: string, userLinkId: string) {
  // Verify ownership before deleting
  const link = await db.query.links.findFirst({
    where: (l, { and, eq: eql }) =>
      and(eql(l.slug, slug), eql(l.userLinkId, userLinkId)),
  });
  if (!link) throw new Error("Link not found or access denied");

  await Promise.all([
    db.delete(links).where(eq(links.slug, slug)),
    redis.del(slug.toLowerCase()),
  ]);
}

export async function deleteLinkAndRevalidate(
  slug: string,
  userLinkId: string,
) {
  await deleteLink(slug, userLinkId);
  revalidatePath("/");
}

export async function updateLinkBySlug(
  slug: string,
  data: Partial<typeof links.$inferInsert>,
) {
  const [updated] = await db
    .update(links)
    .set(data)
    .where(eq(links.slug, slug))
    .returning();
  return updated;
}

export async function updateLinksByUserLinkId(
  fromUserLinkId: string,
  data: Partial<typeof links.$inferInsert>,
) {
  await db.update(links).set(data).where(eq(links.userLinkId, fromUserLinkId));
}

export async function deleteExpiredLinks() {
  // Delete links for anonymous userLinks older than 1 day
  await db.delete(links).where(
    sql`${links.userLinkId} IN (
        SELECT id FROM userLink
        WHERE userId IS NULL
        AND created_at < strftime('%s', 'now', '-1 day')
      )`,
  );
}

// Re-export for use in auth.ts signIn event
export {
  getOrCreateUserLinkByUserId,
  updateUserLink,
} from "~/server/api/user-link";
export { getUserLinkById } from "~/server/api/user-link";
