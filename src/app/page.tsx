import { Suspense } from "react";

import { LinkForm } from "~/components/links/link-form";
import { LinkList, LinkListSkeleton } from "~/components/links/link-list";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-bold">Shorten a URL</h1>
        <p className="text-sm text-muted-foreground">
          Paste a long URL and get a short link instantly.
        </p>
      </div>

      <div className="mb-6">
        <LinkForm />
      </div>

      <Suspense fallback={<LinkListSkeleton />}>
        <LinkList />
      </Suspense>
    </div>
  );
}
