"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "~/components/ui/responsive-dialog";
import { OAuthProviderButton } from "~/components/auth/oauth-provider-button";

export function SigninDialog() {
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogTrigger>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Sign in
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Sign in to Minilink</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Sign in for unlimited link lifespan and extra options
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col gap-3">
          <OAuthProviderButton provider="google" />
          <OAuthProviderButton provider="github" />
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
