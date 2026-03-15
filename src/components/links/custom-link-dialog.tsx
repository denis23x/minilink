"use client";

import { useState } from "react";

import { Button } from "~/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "~/components/ui/responsive-dialog";
import { CustomLinkForm } from "~/components/links/custom-link-form";

interface CustomLinkDialogProps {
  onConfirm: (slug: string) => void;
  onClear: () => void;
  trigger: React.ReactNode;
  initialSlug?: string;
}

export function CustomLinkDialog({ onConfirm, onClear, trigger, initialSlug }: CustomLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initialSlug ?? "");

  function handleConfirm() {
    onConfirm(slug);
    setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    // Clear slug if dialog closes without confirming
    if (!next) onClear();
    setOpen(next);
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogTrigger>
        <span onClick={() => setOpen(true)}>{trigger}</span>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Custom slug</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="p-4">
          <CustomLinkForm onSlugChange={setSlug} initialSlug={initialSlug} />
        </ResponsiveDialogBody>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!slug}>Confirm</Button>
        </div>
        <ResponsiveDialogFooter>
          <ResponsiveDialogClose>
            <Button variant="outline" className="w-full">Cancel</Button>
          </ResponsiveDialogClose>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
