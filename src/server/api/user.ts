import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import type { UserWithLink } from "~/types";
import { eq } from "drizzle-orm";

export async function getUserById(
  id: string,
): Promise<UserWithLink | undefined> {
  return db.query.users.findFirst({
    where: eq(users.id, id),
    with: { userLink: true },
  });
}
