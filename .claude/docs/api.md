---
paths:
  - src/server/actions/**
  - src/server/api/**
  - src/app/api/**
---

# API / Data Layer Rules

## `src/server/api/` — Database & Redis Operations

Each file groups operations by domain:

| File           | Description                                      |
| -------------- | ------------------------------------------------ |
| `link.ts`      | DB + Redis CRUD for `link` table                 |
| `user-link.ts` | DB CRUD for `userLink` table + cookie management |
| `user.ts`      | `getUserById` — fetch user record                |

Rules:

- Always use the Drizzle `db` client from `~/server/db`
- The `eslint-plugin-drizzle` rule enforces `.where()` on every `delete` / `update`
- Redis operations (`redis.set`, `redis.del`, `redis.persist`) live here, co-located with DB writes
- `revalidatePath` is generally the server action's responsibility; `deleteLinkAndRevalidate` is an intentional exception that wraps delete + revalidate for convenience

```typescript
// ✅ generateShortLink — DB insert + totalLinks increment + Redis set, all in Promise.all
export async function generateShortLink({ userLinkId, slug, url, description, isGuestUser }: ...) {
  const encodedUrl = encodeURIComponent(url)
  const redisOptions = isGuestUser ? { ex: GUEST_LINK_EXPIRE_TIME } : undefined
  await Promise.all([
    db.insert(links).values({ slug, url: encodedUrl, userLinkId, description }).run(),
    db.update(userLinks).set({ totalLinks: sql`${userLinks.totalLinks} + 1` }).where(eq(userLinks.id, userLinkId)).run(),
    redis.set(slug.toLowerCase(), encodedUrl, redisOptions),
  ])
}
```

## `src/server/actions/link.ts` — Server Actions

Built with `next-safe-action`. Two clients are available:

| Client       | File                   | Auth required | Context passed |
| ------------ | ---------------------- | ------------- | -------------- |
| `action`     | `~/lib/safe-action.ts` | No            | none           |
| `authAction` | `~/lib/safe-action.ts` | Yes           | `{ user }`     |

### Actions

| Action            | Client       | Description                                   |
| ----------------- | ------------ | --------------------------------------------- |
| `createShortLink` | `action`     | Creates link for authenticated or guest user  |
| `deleteShortLink` | `action`     | Deletes a link (cookie or session authorized) |
| `editShortLink`   | `authAction` | Edits slug, URL, description of existing link |
| `checkSlug`       | `authAction` | Returns `boolean` — whether a slug is taken   |

Rules:

- Always call `revalidatePath("/")` after any mutation that changes visible data
- Throw `MyCustomError` for expected business errors — these are surfaced to the client as `result.serverError`
- All inputs are validated via Zod schemas in `~/lib/validations/link.tsx`

```typescript
// ✅ Pattern — action (unauthenticated)
export const createShortLink = action(
  insertLinkSchema,
  async ({ url, slug }) => {
    // ...
    revalidatePath("/");
    return { message: "Link creation successful" };
  },
);

// ✅ Pattern — authAction (session required)
export const editShortLink = authAction(
  editLinkSchema,
  async ({ slug, newLink }, { user }) => {
    // user.id is guaranteed present
    revalidatePath("/");
    return { message: "Link edited successfully" };
  },
);
```

## `src/app/api/` — Next.js API Routes

Minimal — only for system/cron endpoints:

| Method | Path        | Description                                                       |
| ------ | ----------- | ----------------------------------------------------------------- |
| `GET`  | `/api/cron` | Daily cleanup job; requires `Authorization: Bearer <CRON_SECRET>` |

Do **not** add domain logic here — use `src/server/api/` + `src/server/actions/` instead.

## Client-Side Usage (`useAction`)

Components call server actions via `useAction` from `next-safe-action/hooks`:

```typescript
import { createShortLink } from "~/server/actions/link";
import { useAction } from "next-safe-action/hooks";

const { execute, status } = useAction(createShortLink, {
  onSuccess: () => toast.success("Link created!"),
  onError: ({ serverError }) =>
    toast.error(serverError ?? "Something went wrong"),
});
```
