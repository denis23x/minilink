"use client";

import { deleteShortLink } from "~/server/actions/link";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface DeleteLinkDialogProps {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteLinkDialog({
  slug,
  open,
  onOpenChange,
}: DeleteLinkDialogProps) {
  const { execute, isPending } = useAction(deleteShortLink, {
    onSuccess: () => {
      toast.success("Link deleted");
      onOpenChange(false);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Failed to delete link"),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete link?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>/{slug}</strong> and cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => execute({ slug })}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
