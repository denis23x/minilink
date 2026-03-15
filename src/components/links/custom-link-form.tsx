"use client";

import { useEffect, useState } from "react";
import { checkSlug } from "~/server/actions/link";
import { useAction } from "next-safe-action/hooks";
import { useDebounce } from "~/hooks/use-debounce";
import { Input } from "~/components/ui/input";

interface CustomLinkFormProps {
  onSlugChange: (slug: string) => void;
  initialSlug?: string;
}

export function CustomLinkForm({
  onSlugChange,
  initialSlug = "",
}: CustomLinkFormProps) {
  const [slug, setSlug] = useState(initialSlug);
  const debouncedSlug = useDebounce(slug, 400);

  const { execute, result, isPending } = useAction(checkSlug);

  useEffect(() => {
    if (debouncedSlug) {
      execute({ slug: debouncedSlug });
    }
  }, [debouncedSlug, execute]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    onSlugChange(e.target.value);
  }

  const isTaken = result.data?.taken === true;
  const isAvailable = debouncedSlug && result.data?.taken === false;

  return (
    <div className="flex flex-col gap-2">
      <Input
        id="custom-slug"
        placeholder="my-link"
        value={slug}
        onChange={handleChange}
        className={
          isTaken ? "border-destructive" : isAvailable ? "border-green-500" : ""
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
