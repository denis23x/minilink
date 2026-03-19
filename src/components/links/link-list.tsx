import { cookies } from "next/headers";
import { getLinkBySlug, getLinksByUserLinkId } from "~/server/api/link";
import { getUserLinkByUserId } from "~/server/api/user-link";
import { getServerAuthSession } from "~/server/auth";
import { GuestBanner } from "~/components/links/guest-banner";
import { LinkCard } from "~/components/links/link-card";

export async function LinkList() {
  const session = await getServerAuthSession();
  const cookieStore = await cookies();
  const userLinkIdCookie = cookieStore.get("user-link-id")?.value;

  let links: Awaited<ReturnType<typeof getLinksByUserLinkId>> = [];

  if (session) {
    const userLink = await getUserLinkByUserId(session.user.id);
    links = userLink?.links ?? [];
  } else if (userLinkIdCookie) {
    links = await getLinksByUserLinkId(userLinkIdCookie);
  }

  // Show example "github" link when guest has no links
  if (!session) {
    const exampleLink = await getLinkBySlug("github");
    if (exampleLink) {
      links = [exampleLink, ...links];
    }
  }

  if (links.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No links yet. Create your first short link above!
      </p>
    );
  }

  const showGuestBanner = !session && !!userLinkIdCookie && links.length > 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {links.map((link) => (
          <LinkCard key={link.slug} link={link} />
        ))}
      </div>
      {showGuestBanner && <GuestBanner />}
    </div>
  );
}

export function LinkListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg border bg-card" />
      ))}
    </div>
  );
}
