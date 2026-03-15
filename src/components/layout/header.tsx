import { Suspense } from "react";

import { ThemeToggle } from "~/components/theme-toggle";
import { UserProfile } from "~/components/auth/user-profile";

function UserProfileSkeleton() {
  return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
}

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <a href="/" className="text-lg font-bold tracking-tight">
          minilink
        </a>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Suspense fallback={<UserProfileSkeleton />}>
            <UserProfile />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
