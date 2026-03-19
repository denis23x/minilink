"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "~/hooks/use-debounce";
import { setFormErrors } from "~/lib/utils";
import { insertLinkSchema, type InsertLinkInput } from "~/lib/validations/link";
import { checkSlug, editShortLink } from "~/server/actions/link";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/ui/responsive-dialog";

interface EditLinkDialogProps {
  slug: string;
  url: string;
  description?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLinkDialog({
  slug,
  url,
  description,
  open,
  onOpenChange,
}: EditLinkDialogProps) {
  const [slugStatus, setSlugStatus] = useState<"idle" | "taken" | "available">("idle");

  const form = useForm<InsertLinkInput>({
    resolver: zodResolver(insertLinkSchema),
    defaultValues: {
      slug,
      url: decodeURIComponent(url),
      description: description ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        slug,
        url: decodeURIComponent(url),
        description: description ?? "",
      });
      setSlugStatus("idle");
    }
  }, [open, slug, url, description, form]);

  const watchedSlug = form.watch("slug");
  const debouncedSlug = useDebounce(watchedSlug, 400);

  const { execute: checkSlugAvailability } = useAction(checkSlug, {
    onSuccess: ({ data }) =>
      setSlugStatus(data?.taken ? "taken" : "available"),
  });

  useEffect(() => {
    if (debouncedSlug && debouncedSlug !== slug) {
      checkSlugAvailability({ slug: debouncedSlug });
    } else {
      setSlugStatus("idle");
    }
  }, [debouncedSlug, slug, checkSlugAvailability]);

  const { execute: executeEdit, isPending } = useAction(editShortLink, {
    onSuccess: () => {
      toast.success("Link updated");
      onOpenChange(false);
    },
    onError: ({ error }) => {
      if (error.validationErrors) {
        setFormErrors(
          error.validationErrors as Record<string, string[] | undefined>,
          form.setError,
        );
      } else {
        toast.error(error.serverError ?? "Failed to update link");
      }
    },
  });

  function onSubmit(values: InsertLinkInput) {
    if (slugStatus === "taken") return;
    executeEdit({ slug, newLink: values });
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Edit link</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Update the URL, description or slug
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col gap-3">
          <Form {...form}>
            <form
              id="edit-link-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-3"
            >
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        inputMode="url"
                        autoComplete="off"
                        spellCheck="false"
                        autoCapitalize="none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="my-link"
                        aria-invalid={slugStatus === "taken" || undefined}
                        className={
                          slugStatus === "available" ? "border-green-500" : ""
                        }
                        {...field}
                      />
                    </FormControl>
                    {slugStatus === "taken" && (
                      <p className="text-xs text-destructive">
                        Slug is already taken
                      </p>
                    )}
                    {slugStatus === "available" && (
                      <p className="text-xs text-green-500">Slug is available</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <div className="flex flex-col justify-end gap-3">
            <Button
              type="submit"
              form="edit-link-form"
              disabled={isPending || slugStatus === "taken"}
            >
              {isPending && <Loader />}
              Save changes
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
