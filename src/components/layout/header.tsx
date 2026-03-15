import { Suspense } from "react";
import { Github, Scissors } from "lucide-react";
import { Button } from "~/components/ui/button";
import { UserProfile } from "~/components/auth/user-profile";
import { ThemeToggle } from "~/components/theme-toggle";

function UserProfileSkeleton() {
  return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />;
}

export function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Button variant="outline" asChild>
          <a href="/" className="text-lg flex items-center gap-2">
            <Scissors className="size-4" />
            <span className="font-semibold">
              mini<span className="text-muted-foreground">link</span>
            </span>
          </a>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/denis23x/minilink"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="size-4" />
            </a>
          </Button>
          <ThemeToggle />
          <Suspense fallback={<UserProfileSkeleton />}>
            <UserProfile />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
