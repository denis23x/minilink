import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

import { links } from "~/server/db/schema";

// Allows alphanumeric, hyphens, underscores — empty string permitted so guests
// can submit slug: "" and let the server auto-generate via generateRandomSlug()
export const slugRegex = /^[a-zA-Z0-9_-]*$/;

export const insertLinkSchema = createInsertSchema(links)
  .pick({ slug: true, url: true, description: true })
  .extend({
    url: z.string().url(),
    // Empty string is valid — server auto-generates when slug === ""
    slug: z.string().max(30).refine((value) => slugRegex.test(value), {
      message: "Slug can only contain letters, numbers, hyphens, and underscores",
    }),
    description: z.string().max(255).optional(),
  });

export const editLinkSchema = z.object({
  slug: z.string(),
  newLink: insertLinkSchema,
});

export type InsertLinkInput = z.infer<typeof insertLinkSchema>;
export type EditLinkInput = z.infer<typeof editLinkSchema>;
