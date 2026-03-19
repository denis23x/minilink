"use client";

import { useState } from "react";
import { SigninDialog } from "~/components/auth/signin-dialog";

export function GuestBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p className="text-center text-xs text-muted-foreground">
        Maximize your link&apos;s lifespan beyond 24 hours by{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="underline underline-offset-4 hover:text-foreground cursor-pointer"
        >
          signing in
        </button>{" "}
        and accessing exclusive editing features!
      </p>
      <SigninDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
