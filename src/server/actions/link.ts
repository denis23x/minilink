"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  checkSlugExists,
  deleteLinkAndRevalidate,
  generateRandomSlug,
  generateShortLink,
  getLinkBySlug,
  updateLinkBySlug,
} from "~/server/api/link";
import {
  getOrCreateUserLinkById,
  getOrCreateUserLinkByUserId,
  setUserLinkIdCookie,
} from "~/server/api/user-link";
import { getServerAuthSession } from "~/server/auth";
import { redis } from "~/server/redis";
import { z } from "zod";
import { action, authAction, MyCustomError } from "~/lib/safe-action";
import { editLinkSchema, insertLinkSchema } from "~/lib/validations/link";

export const createShortLink = action
  .schema(insertLinkSchema)
  .action(async ({ parsedInput: { url, slug, description } }) => {
    // Resolve final slug before reading session
    const finalSlug = slug === "" ? await generateRandomSlug() : slug;

    const session = await getServerAuthSession();

    if (session) {
      const userLink = await getOrCreateUserLinkByUserId(session.user.id);
      if (!userLink)
        throw new MyCustomError("Failed to get or create user link");
      await generateShortLink({
        userLinkId: userLink.id,
        slug: finalSlug,
        url,
        description,
        isGuestUser: false,
      });
    } else {
      const cookieStore = await cookies();
      const cookieId = cookieStore.get("user-link-id")?.value;
      const userLink = await getOrCreateUserLinkById(cookieId ?? "");
      if (!userLink)
        throw new MyCustomError("Failed to get or create user link");
      await setUserLinkIdCookie(userLink.id);
      await generateShortLink({
        userLinkId: userLink.id,
        slug: finalSlug,
        url,
        description,
        isGuestUser: true,
      });
    }

    revalidatePath("/");
    return { message: "Link created successfully" };
  });

export const deleteShortLink = action
  .schema(z.object({ slug: z.string() }))
  .action(async ({ parsedInput: { slug } }) => {
    const session = await getServerAuthSession();
    let userLinkId: string | undefined;

    if (session) {
      const userLink = await getOrCreateUserLinkByUserId(session.user.id);
      userLinkId = userLink?.id;
    } else {
      const cookieStore = await cookies();
      userLinkId = cookieStore.get("user-link-id")?.value;
    }

    if (!userLinkId)
      throw new MyCustomError("Not authorized to delete this link");
    await deleteLinkAndRevalidate(slug, userLinkId);
    return { message: "Link deleted successfully" };
  });

export const editShortLink = authAction
  .schema(editLinkSchema)
  .action(async ({ parsedInput: { slug, newLink }, ctx: { user } }) => {
    const existing = await getLinkBySlug(slug);
    if (!existing) throw new MyCustomError("Link not found");
    if (existing.userLink?.userId !== user.id)
      throw new MyCustomError("Forbidden");

    // Only check slug availability if slug is changing — checking against the same
    // slug would return true (it's taken by this link) and incorrectly block the edit
    if (newLink.slug !== slug) {
      const taken = await checkSlugExists(newLink.slug);
      if (taken) throw new MyCustomError("Slug is already taken");
    }

    await updateLinkBySlug(slug, {
      slug: newLink.slug,
      url: encodeURIComponent(newLink.url),
      description: newLink.description,
    });

    if (newLink.slug !== slug) {
      await redis.del(slug.toLowerCase());
      await redis.set(
        newLink.slug.toLowerCase(),
        encodeURIComponent(newLink.url),
      );
    } else {
      await redis.set(slug.toLowerCase(), encodeURIComponent(newLink.url));
    }

    revalidatePath("/");
    return { message: "Link updated successfully" };
  });

export const checkSlug = authAction
  .schema(insertLinkSchema.pick({ slug: true }))
  .action(async ({ parsedInput: { slug } }) => {
    const taken = await checkSlugExists(slug);
    return { taken };
  });
