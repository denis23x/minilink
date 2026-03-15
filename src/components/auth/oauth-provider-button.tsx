"use client";

import { signIn } from "next-auth/react";

import { Button } from "~/components/ui/button";
import { Icons, iconVariants } from "~/components/ui/icons";

interface OAuthProviderButtonProps {
  provider: "github" | "google";
}

const providerConfig = {
  github: { label: "Continue with GitHub", icon: Icons.github },
  google: { label: "Continue with Google", icon: Icons.google },
} as const;

export function OAuthProviderButton({ provider }: OAuthProviderButtonProps) {
  const { label, icon: Icon } = providerConfig[provider];

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      onClick={() => signIn(provider)}
    >
      <Icon className={iconVariants({ size: "sm" })} />
      {label}
    </Button>
  );
}
