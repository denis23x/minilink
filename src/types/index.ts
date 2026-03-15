import type { links, userLinks, users } from "~/server/db/schema";

export type ShortLink = typeof links.$inferSelect;
export type UserLink = typeof userLinks.$inferSelect;
export type UserWithLink = typeof users.$inferSelect & {
  userLink: UserLink | null;
};
export type SafeActionError = {
  serverError?: string;
  validationErrors?: Record<string, string[]>;
};
