import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ─── NextAuth tables ─────────────────────────────────────────────────────────

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(Math.floor(Date.now() / 1000) * 1000),
  ),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").notNull().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// ─── App tables ───────────────────────────────────────────────────────────────

export const userLinks = sqliteTable("userLink", {
  id: text("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  totalLinks: integer("total_links").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(Math.floor(Date.now() / 1000) * 1000),
  ),
});

export const links = sqliteTable("link", {
  slug: text("slug", { length: 30 }).primaryKey(),
  userLinkId: text("userLinkId")
    .notNull()
    .references(() => userLinks.id, { onDelete: "cascade" }),
  description: text("description", { length: 255 }),
  url: text("url").notNull(),
  clicks: integer("clicks").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(Math.floor(Date.now() / 1000) * 1000),
  ),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one }) => ({
  userLink: one(userLinks, {
    fields: [users.id],
    references: [userLinks.userId],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const userLinksRelations = relations(userLinks, ({ one, many }) => ({
  user: one(users, { fields: [userLinks.userId], references: [users.id] }),
  links: many(links),
}));

export const linksRelations = relations(links, ({ one }) => ({
  userLink: one(userLinks, {
    fields: [links.userLinkId],
    references: [userLinks.id],
  }),
}));
