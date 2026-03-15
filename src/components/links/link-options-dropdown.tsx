"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import type { InsertLinkInput } from "~/lib/validations/link";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Icons, iconVariants } from "~/components/ui/icons";
import { ProtectedElement } from "~/components/ui/protected-element";
import { editShortLink } from "~/server/actions/link";
import { CustomLinkDialog } from "~/components/links/custom-link-dialog";
import { DeleteLinkDialog } from "~/components/links/delete-link-dialog";
import { LinkQRCodeDialog } from "~/components/links/link-qrcode-dialog";

interface LinkOptionsDropdownProps {
  slug: string;
  url: string;
  description?: string | null;
  shortUrl: string;
}

export function LinkOptionsDropdown({ slug, url, description, shortUrl }: LinkOptionsDropdownProps) {
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editSlug, setEditSlug] = useState(slug);

  const { execute: executeEdit } = useAction(editShortLink, {
    onSuccess: () => toast.success("Link updated"),
    onError: ({ error }) => toast.error(error.serverError ?? "Failed to update link"),
  });

  function handleEditConfirm(newSlug: string) {
    const newLink: InsertLinkInput = {
      slug: newSlug,
      url: decodeURIComponent(url),
      description: description ?? undefined,
    };
    executeEdit({ slug, newLink });
    setEditSlug(newSlug);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Link options">
            <Icons.moreHorizontal className={iconVariants({ size: "sm" })} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ProtectedElement session={session ?? null} message="Sign in to edit links">
            <DropdownMenuItem asChild>
              <CustomLinkDialog
                onConfirm={handleEditConfirm}
                onClear={() => setEditSlug(slug)}
                initialSlug={editSlug}
                trigger={
                  <button className="flex w-full items-center gap-2">
                    <Icons.edit className={iconVariants({ size: "sm" })} />
                    Edit
                  </button>
                }
              />
            </DropdownMenuItem>
          </ProtectedElement>
          <DropdownMenuItem asChild>
            <LinkQRCodeDialog
              shortUrl={shortUrl}
              trigger={
                <button className="flex w-full items-center gap-2">
                  <Icons.qrCode className={iconVariants({ size: "sm" })} />
                  QR Code
                </button>
              }
            />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Icons.trash className={iconVariants({ size: "sm" })} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteLinkDialog slug={slug} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
