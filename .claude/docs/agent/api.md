# API Reference

## Server Actions

All mutations go through `next-safe-action` server actions in `src/server/actions/link.ts`.

Two action clients in `src/lib/safe-action.ts`:

- `action` — open to anyone; validates Zod schema; exposes `MyCustomError` messages
- `authAction` — requires a valid NextAuth session; injects `{ user }` into the handler context

### Actions

| Action            | Client       | Schema                           | Description                                  |
| ----------------- | ------------ | -------------------------------- | -------------------------------------------- |
| `createShortLink` | `action`     | `insertLinkSchema`               | Creates a link for authenticated or guest    |
| `deleteShortLink` | `action`     | `z.object({ slug: z.string() })` | Deletes a link (cookie or session)           |
| `editShortLink`   | `authAction` | `editLinkSchema`                 | Edits slug, URL, description of a link       |
| `checkSlug`       | `authAction` | `insertLinkSchema.pick({ slug })` | Returns `boolean` — slug availability       |

### Guest Link Flow

1. Read `user-link-id` cookie — if missing, `createNewUserLink()` (no `userId`)
2. Set `user-link-id` cookie (30-day expiry, httpOnly, `secure` in prod, SameSite=lax)
3. Store slug in Redis with `ex: GUEST_LINK_EXPIRE_TIME` (86400s = 24h TTL)
4. Insert `link` row in DB + atomically increment `userLinks.totalLinks`

### Authenticated Link Flow

1. `getOrCreateUserLinkByUserId(session.user.id)` — find or create their permanent `userLink`
2. Store slug in Redis **without** TTL (persists indefinitely)
3. Insert `link` row in DB + atomically increment `userLinks.totalLinks`
4. Custom slugs and link editing are only available to authenticated users

### Sign-In Migration (from guest to authenticated)

Handled by the `signIn` event in `src/server/auth.ts`:

1. Read the `user-link-id` cookie — if missing, return early
2. If user already has a `userLink`: migrate the anonymous links to their account (`updateLinksByUserLinkId`), call `redis.persist()` on each slug
3. If user has no `userLink` yet: claim the anonymous one (`updateUserLink({ userId })`), persist Redis keys
4. If no matching `userLink` found by cookie id: create a fresh `userLink`
5. Delete the `user-link-id` cookie

## Next.js API Routes

| Method | Path        | Description                                              |
| ------ | ----------- | -------------------------------------------------------- |
| `GET`  | `/api/cron` | Daily cleanup; deletes expired guest links + userLinks   |

### Cron Authorization

```http
Authorization: Bearer <CRON_SECRET>
```

`CRON_SECRET` is read via `process.env.CRON_SECRET` directly (not in `env.js`). Returns `401` if the header is missing or incorrect.

## Redirect Mechanism

`src/middleware.ts` → `src/server/middlewares/linkMiddleware.ts`.

Middleware matcher **excludes**: `/api/`, `/_next/`, `/_proxy/`, `/_static`, `/_vercel`, and static files.

```
GET /{slug}
  → redis.get(slug.toLowerCase())              // fast path — slug keys stored lowercase
  → db.update(links).set({ clicks: +1 })      // fire-and-forget parallel
  → if URL found: 302 redirect to decodeURIComponent(url)
  → if not found: NextResponse.next()          // falls through to home page
```

Requests to `/` and multi-segment paths (more than one `/`) are also short-circuited inside `linkMiddleware` with `NextResponse.next()`.

## Validation Schemas (`src/lib/validations/link.tsx`)

```typescript
export const insertLinkSchema = createInsertSchema(links)
  .pick({ slug: true, url: true, description: true })
  .extend({
    url: z.string().url(),
    slug: z.string().max(30).refine((value) => slugRegex.test(value)),
    description: z.string().max(255).optional(),
  });

export const editLinkSchema = z.object({
  slug: z.string(),
  newLink: insertLinkSchema,
});
```

Guest creation passes `slug: ""` — the server auto-generates a 6-char nanoid slug via `generateRandomSlug()`.

## DB + Redis API

### `src/server/api/link.ts`

| Function                   | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `generateRandomSlug()`     | Generates a unique 6-char nanoid, recursively retries on collision      |
| `checkSlugExists(slug)`    | Checks **Redis** (`redis.exists`) — returns `true` if slug is taken     |
| `getLinkBySlug(slug)`      | DB lookup with `COLLATE NOCASE`; returns `ShortLink \| undefined`       |
| `getLinksByUserLinkId(id)` | Fetch links for a `userLinkId` created in the last 24h (guest-safe)     |
| `generateShortLink(...)`   | Insert link + increment `totalLinks` + set Redis key — all in `Promise.all` |
| `deleteLink(slug, userLinkId)` | Verifies ownership, deletes from DB + Redis                         |
| `deleteLinkAndRevalidate(slug, id)` | Calls `deleteLink` + `revalidatePath("/")` — convenience wrapper |
| `updateLinkBySlug(slug, data)` | Update link fields in DB; returns updated row                       |
| `updateLinksByUserLinkId(id, data)` | Bulk-update links by `userLinkId` (used in sign-in migration)  |
| `deleteExpiredLinks()`     | Raw SQL: delete links for anonymous `userLink`s older than 1 day        |

### `src/server/api/user-link.ts`

| Function                            | Description                                                     |
| ----------------------------------- | --------------------------------------------------------------- |
| `createNewUserLink(userId?)`        | Insert a new `userLink`; `userId` is optional (guest = null)    |
| `getUserLinkById(id)`               | Fetch `userLink` with related `links` by id                     |
| `getUserLinkByUserId(userId)`       | Fetch `userLink` with related `links` by `userId`               |
| `getOrCreateUserLinkByUserId(id)`   | Find or create a `userLink` for an authenticated user           |
| `getOrCreateUserLinkById(id)`       | Find `userLink` by id or create a fresh anonymous one           |
| `updateUserLink(id, data)`          | Update `userLink` fields (e.g. assign `userId` on sign-in)      |
| `setUserLinkIdCookie(id)`           | Set `user-link-id` cookie (30-day expiry, httpOnly, secure prod)|
| `deleteExpiredUserLinks()`          | Raw SQL: delete anonymous `userLink`s older than 30 days        |

### `src/server/api/user.ts`

| Function          | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `getUserById(id)` | Fetch `user` with their `userLink` (via Drizzle `with`) |
