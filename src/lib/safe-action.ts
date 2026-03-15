import { getServerAuthSession } from "~/server/auth";
import { createSafeActionClient } from "next-safe-action";

// Custom error class so messages surface as result.serverError on the client
export class MyCustomError extends Error {}

// Open to anyone
export const action = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof MyCustomError) return e.message;
    return "An unexpected error occurred.";
  },
});

// Requires NextAuth session — injects { user } into handler context
export const authAction = createSafeActionClient({
  handleServerError(e) {
    if (e instanceof MyCustomError) return e.message;
    return "An unexpected error occurred.";
  },
}).use(async ({ next }) => {
  const session = await getServerAuthSession();
  if (!session) throw new MyCustomError("Unauthorized");
  return next({ ctx: { user: session.user } });
});
