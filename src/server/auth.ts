import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import {
  getOrCreateUserLinkByUserId,
  getUserLinkById,
  updateLinksByUserLinkId,
  updateUserLink,
} from "~/server/api/link";
import { createNewUserLink } from "~/server/api/user-link";
import { db } from "~/server/db";
import { redis } from "~/server/redis";
import type { NextAuthOptions, Session } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

const providers: NextAuthOptions["providers"] = [];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as NextAuthOptions["adapter"],
  session: { strategy: "database" },
  providers,
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const guestUserLinkId = cookieStore.get("user-link-id")?.value;

      if (!guestUserLinkId) return;

      const guestUserLink = await getUserLinkById(guestUserLinkId);
      if (!guestUserLink) {
        await createNewUserLink(user.id);
        cookieStore.delete("user-link-id");
        return;
      }

      const existingUserLink = await getOrCreateUserLinkByUserId(user.id);

      if (existingUserLink) {
        // User already has a userLink — reassign guest links to it
        await updateLinksByUserLinkId(guestUserLinkId, {
          userLinkId: existingUserLink.id,
        });
        for (const link of guestUserLink.links) {
          await redis.persist(link.slug.toLowerCase());
        }
      } else {
        // Claim the anonymous userLink for this user
        await updateUserLink(guestUserLinkId, { userId: user.id });
        for (const link of guestUserLink.links) {
          await redis.persist(link.slug.toLowerCase());
        }
      }

      cookieStore.delete("user-link-id");
    },
  },
};

export function getServerAuthSession(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
): Promise<Session | null> {
  return getServerSession(...args, authOptions);
}
