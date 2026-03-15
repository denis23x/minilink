"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createShortLink } from "~/server/actions/link";
import { Settings, WandSparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { setFormErrors } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/ui/loader";
import { ProtectedElement } from "~/components/ui/protected-element";
import { CustomLinkDialog } from "~/components/links/custom-link-dialog";

const schema = z.object({ url: z.string().url("Please enter a valid URL") });
type FormValues = z.infer<typeof schema>;

export function LinkForm() {
  const { data: session } = useSession();
  const [customSlug, setCustomSlug] = useState("");
  const [customSlugOpen, setCustomSlugOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { url: "" },
  });

  const { execute, isPending } = useAction(createShortLink, {
    onSuccess: () => {
      form.reset();
      setCustomSlug("");
      toast.success("Short link created!");
    },
    onError: ({ error }) => {
      if (error.validationErrors) {
        setFormErrors(
          error.validationErrors as Record<string, string[] | undefined>,
          form.setError,
        );
      } else {
        toast.error(error.serverError ?? "Something went wrong");
      }
    },
  });

  function onSubmit({ url }: FormValues) {
    execute({ url, slug: customSlug, description: undefined });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-2"
      >
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input
                    placeholder="https://example.com/very-long-url"
                    autoComplete="off"
                    inputMode="url"
                    spellCheck="false"
                    autoCapitalize="none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader /> : <WandSparkles />} Shorten
          </Button>
          <ProtectedElement
            session={session ?? null}
            message="Sign in to use custom slugs"
          >
            <Button
              variant="outline"
              size="icon"
              type="button"
              disabled={!session}
              onClick={() => setCustomSlugOpen(true)}
            >
              <Settings />
            </Button>
          </ProtectedElement>
          <CustomLinkDialog
            open={customSlugOpen}
            onOpenChange={(next) => {
              if (!next) setCustomSlug("");
              setCustomSlugOpen(next);
            }}
            onConfirm={setCustomSlug}
            onClear={() => setCustomSlug("")}
            initialSlug={customSlug}
          />
        </div>
      </form>
    </Form>
  );
}
