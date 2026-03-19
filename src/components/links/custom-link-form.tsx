"use client";

import { useEffect, useState } from "react";
import { checkSlug } from "~/server/actions/link";
import { useAction } from "next-safe-action/hooks";
import { useDebounce } from "~/hooks/use-debounce";
import { Input } from "~/components/ui/input";

interface CustomLinkFormProps {
  onSlugChange: (slug: string) => void;
  onStatusChange?: (status: "idle" | "taken" | "available") => void;
  initialSlug?: string;
  excludeSlug?: string;
}

export function CustomLinkForm({
  onSlugChange,
  onStatusChange,
  initialSlug = "",
  excludeSlug,
}: CustomLinkFormProps) {
  const [slug, setSlug] = useState(initialSlug);
  const debouncedSlug = useDebounce(slug, 400);

  const { execute, result, isPending } = useAction(checkSlug, {
    onSuccess: ({ data }) => {
      onStatusChange?.(data?.taken ? "taken" : "available");
    },
  });

  useEffect(() => {
    if (debouncedSlug && debouncedSlug !== excludeSlug) {
      execute({ slug: debouncedSlug });
    }
  }, [debouncedSlug, excludeSlug, execute]);

  useEffect(() => {
    if (!debouncedSlug || debouncedSlug === excludeSlug) {
      onStatusChange?.("idle");
    }
  }, [debouncedSlug, excludeSlug, onStatusChange]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    onSlugChange(e.target.value);
  }

  const isTaken = debouncedSlug !== excludeSlug && result.data?.taken === true;
  const isAvailable =
    debouncedSlug !== excludeSlug &&
    !!debouncedSlug &&
    result.data?.taken === false;

  return (
    <div className="flex flex-col gap-2">
      <Input
        id="custom-slug"
        placeholder="my-link"
        value={slug}
        onChange={handleChange}
        disabled={isPending}
        className={
          isTaken
            ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40"
            : isAvailable
              ? "border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/40"
              : ""
        }
      />
      {isPending && (
        <p className="text-xs text-muted-foreground">Checking availability…</p>
      )}
      {!isPending && isTaken && (
        <p className="text-xs text-destructive">Slug is already taken</p>
      )}
      {!isPending && isAvailable && (
        <p className="text-xs text-green-500">Slug is available</p>
      )}
    </div>
  );
}
