"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Icons, iconVariants } from "~/components/ui/icons";

interface LinkCopyButtonProps {
  shortUrl: string;
}

export function LinkCopyButton({ shortUrl }: LinkCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      aria-label="Copy link"
    >
      {copied ? (
        <Icons.check className={iconVariants({ size: "sm" })} />
      ) : (
        <Icons.copy className={iconVariants({ size: "sm" })} />
      )}
    </Button>
  );
}
