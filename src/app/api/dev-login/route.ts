import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "~/server/db";
import { sessions, users } from "~/server/db/schema";

const DEV_USER_ID = "dev-user-local";
const DEV_SESSION_TOKEN = "dev-session-local";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response("Not found", { status: 404 });
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, DEV_USER_ID))
    .limit(1);

  if (!existing.length) {
    await db.insert(users).values({
      id: DEV_USER_ID,
      name: "Dev User",
      email: "dev@localhost",
    });
  }

  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db
    .insert(sessions)
    .values({ sessionToken: DEV_SESSION_TOKEN, userId: DEV_USER_ID, expires })
    .onConflictDoUpdate({ target: sessions.sessionToken, set: { expires } });

  const cookieStore = await cookies();

  cookieStore.set("next-auth.session-token", DEV_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  redirect("/");
}
