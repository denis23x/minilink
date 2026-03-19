"use client";

import { useState } from "react";
import { Edit2, MoreHorizontal, QrCode, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ProtectedElement } from "~/components/ui/protected-element";
import { DeleteLinkDialog } from "~/components/links/delete-link-dialog";
import { EditLinkDialog } from "~/components/links/edit-link-dialog";
import { LinkQRCodeDialog } from "~/components/links/link-qrcode-dialog";

interface LinkOptionsDropdownProps {
  slug: string;
  url: string;
  description?: string | null;
  shortUrl: string;
}

export function LinkOptionsDropdown({
  slug,
  url,
  description,
  shortUrl,
}: LinkOptionsDropdownProps) {
  const { data: session } = useSession();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Link options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ProtectedElement
            session={session ?? null}
            message="Sign in to edit links"
          >
            <DropdownMenuItem
              onClick={() => setEditOpen(true)}
              disabled={!session}
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
          </ProtectedElement>
          <DropdownMenuItem onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4" />
            QR Code
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditLinkDialog
        slug={slug}
        url={url}
        description={description}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <LinkQRCodeDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        shortUrl={shortUrl}
      />
      <DeleteLinkDialog
        slug={slug}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
