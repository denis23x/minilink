"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/ui/responsive-dialog";
import { CustomLinkForm } from "~/components/links/custom-link-form";

interface CustomLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (slug: string) => void;
  onClear: () => void;
  initialSlug?: string;
}

export function CustomLinkDialog({
  open,
  onOpenChange,
  onConfirm,
  onClear,
  initialSlug,
}: CustomLinkDialogProps) {
  const [slug, setSlug] = useState(initialSlug ?? "");

  function handleConfirm() {
    onConfirm(slug);
    onOpenChange(false);
  }

  function handleOpenChange(next: boolean) {
    // Clear slug if dialog closes without confirming
    if (!next) onClear();
    onOpenChange(next);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Custom slug</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Enter a custom slug for your link
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col gap-3">
          <CustomLinkForm onSlugChange={setSlug} initialSlug={initialSlug} />
          <div className="flex flex-col justify-end gap-3">
            <Button onClick={handleConfirm} disabled={!slug}>
              Confirm
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
