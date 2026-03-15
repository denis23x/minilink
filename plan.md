# Minilink — Build Plan

A step-by-step guide to building the short link service from scratch.

---

## Overview

Minilink is a URL shortener built on **Next.js App Router** (canary) with a single user-facing route (`/`). Redirects are handled at the edge via middleware + Upstash Redis. Data is persisted in Turso (SQLite edge DB) via Drizzle ORM. Auth is NextAuth.js v4 (GitHub + Google OAuth).

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router (canary), PPR enabled |
| Language | TypeScript (strict) |
| Package manager | `pnpm` |
| Database | Turso (SQLite edge) + Drizzle ORM |
| Cache / redirects | Upstash Redis |
| Mutations | `next-safe-action` + Zod |
| Auth | NextAuth.js v4, Drizzle adapter |
| UI | shadcn/ui (`new-york`, `neutral`), Tailwind CSS |
| Hosting | Vercel (cron job for cleanup) |

---

## Phase 1 — Project Scaffolding

### 1.1 Initialize Next.js project

```bash
pnpm create next-app@canary minilink --typescript --tailwind --eslint --app --src-dir --import-alias "~/*"
```

### 1.2 Install core dependencies

```bash
# ORM + DB
pnpm add drizzle-orm @libsql/client drizzle-zod
pnpm add -D drizzle-kit

# Redis
pnpm add @upstash/redis

# Auth
# @next-auth/drizzle-adapter is the correct adapter for NextAuth v4; @auth/drizzle-adapter is for Auth.js v5
pnpm add next-auth @next-auth/drizzle-adapter

# Mutations
pnpm add next-safe-action zod

# IDs
pnpm add @paralleldrive/cuid2 nanoid

# UI
pnpm add class-variance-authority clsx tailwind-merge tailwindcss-animate
pnpm add sonner date-fns next-themes lucide-react geist

# Forms
pnpm add react-hook-form @hookform/resolvers

# Env validation
pnpm add @t3-oss/env-nextjs

# Dev
pnpm add -D eslint-plugin-drizzle @ianvs/prettier-plugin-sort-imports
```

### 1.3 Configure `tsconfig.json`

Enable strict mode extras:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 1.4 Configure `next.config.js`

```js
/** @type {import('next').NextConfig} */
const config = {
  experimental: { ppr: true },
  images: {
    remotePatterns: [{ hostname: "t3.gstatic.com" }],
  },
  logging: { fetches: { fullUrl: true } },
}

module.exports = config
```

### 1.5 Configure `prettier.config.js`

Use `@ianvs/prettier-plugin-sort-imports` with the import order:
React → Next.js → third-party → `~/types/` → `~/lib/` → `~/hooks/` → `~/components/ui/` → `~/components/` → `~/styles/` → relative.

### 1.6 Configure `.eslintrc.cjs`

Add rules:
- `consistent-type-imports` — enforce `import type { X }` for type-only imports
- `no-unused-vars` — warn, `_`-prefixed exempt
- `drizzle/enforce-delete-with-where` — error
- `drizzle/enforce-update-with-where` — error
- `no-misused-promises` — error, `checksVoidReturn.attributes: false`

---

## Phase 2 — Environment Variables

### 2.1 Create `.env.local`

```env
# Always required
TURSO_URL=
TURSO_AUTH_TOKEN=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
GITHUB_ID=
GITHUB_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CRON_SECRET=

# Dev only — do NOT add to Vercel or any production environment
NEXTAUTH_URL=http://localhost:3000

# Production only — not needed in .env.local during local development
# NEXTAUTH_SECRET=

# Optional — production domain used by getBaseUrl()
DOMAIN_URL=
```

### 2.2 Create `src/env.js`

Use `@t3-oss/env-nextjs` to validate all server-side variables at build time.
`UPSTASH_*` and `CRON_SECRET` are read directly via `process.env` — do not add them to `env.js`.

---

## Phase 3 — Database Layer

### 3.1 Drizzle client — `src/server/db/index.ts`

Initialize `@libsql/client` with `TURSO_URL` + `TURSO_AUTH_TOKEN`. Wrap with `drizzle()`.

### 3.2 Schema — `src/server/db/schema.ts`

Define all tables:

**`users`** — NextAuth user (id: NextAuth-generated text PK, name, email, emailVerified, image, createdAt)

**`accounts`** — NextAuth OAuth accounts (compound PK: userId + provider + providerAccountId, ON DELETE CASCADE)

**`sessions`** — NextAuth database sessions (sessionToken PK, userId FK, expires)

**`verificationTokens`** — NextAuth (compound PK: identifier + token, expires) — unused but required by adapter

**`userLinks`** — ownership container:
- `id` TEXT, cuid2, PK
- `userId` TEXT, FK → users.id, ON DELETE CASCADE, nullable (NULL = guest)
- `totalLinks` INTEGER, default 0
- `createdAt` INTEGER (unix epoch)

**`links`** — the short links:
- `slug` TEXT (max 30), PK
- `userLinkId` TEXT, FK → userLinks.id, ON DELETE CASCADE
- `description` TEXT (max 255), nullable
- `url` TEXT NOT NULL (URL-encoded)
- `clicks` INTEGER, default 0
- `createdAt` INTEGER (unix epoch)

Define Drizzle `relations()` for all tables.

### 3.3 Drizzle config — `drizzle.config.ts`

Point to Turso driver, `src/server/db/schema.ts`, and `drizzle/` output directory.

### 3.4 DB scripts in `package.json`

```json
"db:generate": "drizzle-kit generate",
"db:push":     "drizzle-kit push",
"db:pull":     "drizzle-kit introspect",
"db:studio":   "drizzle-kit studio"
```

Run `pnpm db:push` to apply the schema to Turso.

---

## Phase 4 — Redis Client

### 4.1 `src/server/redis.ts`

```typescript
import { Redis } from "@upstash/redis"
export const redis = Redis.fromEnv()
```

`Redis.fromEnv()` automatically reads `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

---

## Phase 5 — Authentication

### 5.1 NextAuth config — `src/server/auth.ts`

Configure NextAuth v4 with:
- `adapter`: Drizzle adapter
- `session.strategy`: `"database"`
- `providers`: GitHub, Google
- `pages`: none (use defaults)
- `callbacks.session`: expose `user.id` on the session object
- `events.signIn`: guest → user migration hook (see below)

### 5.2 Sign-in migration event

When a user signs in:
1. Read `user-link-id` cookie from the request
2. If missing → return early (no guest links to migrate)
3. If user already has a `userLink`: call `updateLinksByUserLinkId` to reassign anonymous links, then `redis.persist()` on each slug (removes 24h TTL)
4. If user has no `userLink` yet: call `updateUserLink({ userId })` to claim the anonymous one, then persist Redis keys
5. If no matching `userLink` found: create a fresh `userLink` for the user
6. Delete the `user-link-id` cookie

### 5.3 `getServerAuthSession()` helper

Thin wrapper around `getServerSession(authOptions)` — used in all Server Components.

### 5.4 `src/lib/safe-action.ts` — action clients

```typescript
// Open to anyone
export const action = createSafeActionClient()

// Requires NextAuth session — injects { user } into handler context via .use() middleware chaining
export const authAction = createSafeActionClient()
  .use(async ({ next }) => {
    const session = await getServerAuthSession()
    // Throw MyCustomError (not generic Error) so the message surfaces as result.serverError on the client
    if (!session) throw new MyCustomError("Unauthorized")
    return next({ ctx: { user: session.user } })
  })
```

---

## Phase 6 — Server API Layer

All DB + Redis operations live in `src/server/api/`. Never call Drizzle directly from components or actions.

### 6.1 `src/server/api/user.ts`

- `getUserById(id)` — fetch user with their `userLink` via Drizzle `with`

### 6.2 `src/server/api/user-link.ts`

- `createNewUserLink(userId?)` — insert `userLink`; `userId` is optional (guest = null)
- `getUserLinkById(id)` — fetch with related `links`
- `getUserLinkByUserId(userId)` — fetch with related `links`
- `getOrCreateUserLinkByUserId(id)` — find or create for authenticated user
- `getOrCreateUserLinkById(id)` — find or create anonymous `userLink`
- `updateUserLink(id, data)` — update fields (e.g. assign `userId` on sign-in)
- `setUserLinkIdCookie(id)` — set `user-link-id` cookie (30-day expiry, httpOnly, `secure` in prod, SameSite=lax)
- `deleteExpiredUserLinks()` — raw SQL: delete anonymous `userLink`s older than 30 days

### 6.3 `src/server/api/link.ts`

- `generateRandomSlug()` — 6-char nanoid, recursively retries on Redis collision
- `checkSlugExists(slug)` — checks Redis (`redis.exists`) only; slug availability is determined by Redis presence
- `getLinkBySlug(slug)` — DB lookup with `.append(sql\`COLLATE NOCASE\`)` for case-insensitivity
- `getLinksByUserLinkId(id)` — fetch links created in the last 24h (guest-safe)
- `generateShortLink({ userLinkId, slug, url, description, isGuestUser })`:
  ```typescript
  const encodedUrl = encodeURIComponent(url)
  const redisOptions = isGuestUser ? { ex: GUEST_LINK_EXPIRE_TIME } : undefined
  await Promise.all([
    db.insert(links).values({ slug, url: encodedUrl, userLinkId, description }).run(),
    db.update(userLinks).set({ totalLinks: sql`${userLinks.totalLinks} + 1` }).where(eq(userLinks.id, userLinkId)).run(),
    redis.set(slug.toLowerCase(), encodedUrl, redisOptions),
  ])
  ```
- `deleteLink(slug, userLinkId)` — verify ownership → delete from DB + Redis
- `deleteLinkAndRevalidate(slug, id)` — `deleteLink` + `revalidatePath("/")`
- `updateLinkBySlug(slug, data)` — update link fields in DB
- `updateLinksByUserLinkId(id, data)` — bulk-update links (sign-in migration)
- `deleteExpiredLinks()` — raw SQL: delete links for anonymous `userLink`s older than 1 day

---

## Phase 7 — Validation Schemas

### 7.1 `src/lib/validations/link.tsx`

Define `slugRegex` in this file (or in `src/lib/utils.ts`) — it validates allowed slug characters (alphanumeric + hyphens/underscores, no spaces or special chars):

```typescript
// Allows alphanumeric, hyphens, underscores — empty string is permitted so guests
// can submit slug: "" and let the server auto-generate via generateRandomSlug()
export const slugRegex = /^[a-zA-Z0-9_-]*$/

export const insertLinkSchema = createInsertSchema(links)
  .pick({ slug: true, url: true, description: true })
  .extend({
    url: z.string().url(),
    // Empty string is valid — server auto-generates when slug === ""
    slug: z.string().max(30).refine((value) => slugRegex.test(value)),
    description: z.string().max(255).optional(),
  })

export const editLinkSchema = z.object({
  slug: z.string(),
  newLink: insertLinkSchema,
})
```

Guest creation passes `slug: ""` — `slugRegex` allows empty string (`*` quantifier), so validation passes. The server calls `generateRandomSlug()` when `slug === ""`.

---

## Phase 8 — Server Actions

All actions live in `src/server/actions/link.ts`. Always call `revalidatePath("/")` after any mutation. Throw `MyCustomError` for expected business errors.

### 8.1 `createShortLink` (open `action`)

Schema: `insertLinkSchema`

Flow:
1. Resolve the final slug first:
   - If `slug === ""` → call `generateRandomSlug()` (nanoid 6-char, retries on Redis collision)
   - Otherwise → use the provided slug as-is
2. Read session (`getServerAuthSession`)
3. If authenticated → `getOrCreateUserLinkByUserId(session.user.id)` → `generateShortLink({ ..., isGuestUser: false })` (no Redis TTL)
4. If guest → read `user-link-id` cookie → `getOrCreateUserLinkById(cookie)` → `setUserLinkIdCookie(userLink.id)` → `generateShortLink({ ..., isGuestUser: true })` (Redis TTL 24h)
5. `revalidatePath("/")`

### 8.2 `deleteShortLink` (open `action`)

Schema: `z.object({ slug: z.string() })`

Flow:
1. Verify ownership via session or `user-link-id` cookie
2. `deleteLinkAndRevalidate(slug, userLinkId)`

### 8.3 `editShortLink` (`authAction`)

Schema: `editLinkSchema`

Flow:
1. `user.id` is guaranteed present from `authAction` context
2. Fetch the existing link via `getLinkBySlug(slug)` — throw `MyCustomError` if not found
3. Verify ownership: check that the link's `userLink.userId === user.id` — throw `MyCustomError("Forbidden")` if not
4. If `newLink.slug !== slug` (slug is being changed): call `checkSlugExists(newLink.slug)` and throw `MyCustomError` if taken. Skip this step if slug is unchanged — running the check against the same slug would return `true` (it's taken by this very link) and incorrectly block the edit
5. `updateLinkBySlug(slug, newLink)` — update DB record (slug, url, description)
6. Update Redis:
   - If slug changed: `redis.del(oldSlug.toLowerCase())` + `redis.set(newLink.slug.toLowerCase(), encodeURIComponent(newLink.url))`
   - If only URL changed (same slug): `redis.set(slug.toLowerCase(), encodeURIComponent(newLink.url))` (overwrite value in place)
7. `revalidatePath("/")`

### 8.4 `checkSlug` (`authAction`)

Schema: `insertLinkSchema.pick({ slug: true })`

Returns `boolean` — whether the slug is already taken (Redis lookup only).

---

## Phase 9 — Middleware & Redirect Engine

### 9.1 `src/server/middlewares/linkMiddleware.ts`

```
GET /{slug}
  → redis.get(slug.toLowerCase())       // primary fast path
  → db.update(links).set({ clicks: +1 })  // fire-and-forget, parallel
  → if URL found: 302 redirect to decodeURIComponent(url)
  → if not found: NextResponse.next()   // falls through to home page
```

Short-circuit with `NextResponse.next()` for:
- Requests to `/` (home)
- Multi-segment paths (more than one `/`)

### 9.2 `src/middleware.ts`

Export `linkMiddleware` as the default middleware. Configure the matcher to exclude:
- `/api/` routes
- `/_next/` (Next.js internals)
- `/_proxy/`, `/_static`, `/_vercel` (Vercel internals)
- Static files: `favicon.ico`, `*.xml`, `*.txt`, `*.png`, `*.jpg`, `*.svg`, `*.ico`, `*.webmanifest`

---

## Phase 10 — Constants & Utilities

### 10.1 `src/lib/config.ts`

```typescript
export const GUEST_LINK_EXPIRE_TIME = 86400  // 24h in seconds
```

### 10.2 `src/lib/utils.ts`

- `cn(...inputs)` — `clsx` + `tailwind-merge`
- `getBaseUrl()` — returns `DOMAIN_URL` in prod, `http://localhost:3000` in dev
- `nanoid(size?)` — 6-char slug generator (default size 6)
- `formatNumber(n)` — compact notation (e.g. `1.2k`)
- `setFormErrors(errors, setError)` — maps Zod field errors to `react-hook-form` `setError` calls

### 10.3 `src/types/index.ts`

```typescript
export type UserWithLink = typeof users.$inferSelect & { userLink: UserLink | null }
export type SafeActionError = { serverError?: string; validationErrors?: Record<string, string[]> }
```

---

## Phase 11 — UI Foundation

### 11.1 Install shadcn/ui

```bash
pnpm dlx shadcn-ui init
# Style: new-york | Base color: neutral | CSS variables: yes
```

### 11.2 Install shadcn components

```bash
pnpm dlx shadcn-ui add alert-dialog avatar button card dialog drawer dropdown-menu form input label separator sonner textarea tooltip
```

Note: `pnpm dlx shadcn-ui add drawer` installs `vaul` automatically as a dependency — no separate `pnpm add vaul` needed.

### 11.3 `src/styles/globals.css`

Define HSL CSS custom properties for light/dark themes:
- `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
- `--radius: 1rem`

### 11.4 Custom UI components

**`src/components/ui/icons.tsx`** — `Icons` registry (lucide-react + inline SVGs for GitHub/Google) + `iconVariants` CVA (sizes: `xs` → `5xl`)

**`src/components/ui/heading.tsx`** — semantic heading with `variant` prop (`h1`–`h4`) + `isFirstBlock` flag

**`src/components/ui/loader.tsx`** — loading spinner

**`src/components/ui/protected-element.tsx`** — wraps children with a `Tooltip` and disables them when `session` is falsy

**`src/components/ui/responsive-dialog.tsx`** — context-based wrapper:
- Desktop (≥ 768px via `useMediaQuery`): renders Radix `Dialog`
- Mobile: renders `Drawer` (vaul)
- Exports: `ResponsiveDialog`, `ResponsiveDialogTrigger`, `ResponsiveDialogContent`, `ResponsiveDialogBody`, `ResponsiveDialogHeader`, `ResponsiveDialogTitle`, `ResponsiveDialogFooter` (mobile only), `ResponsiveDialogClose` (mobile only)

### 11.5 Theme

**`src/components/theme-provider.tsx`** — `next-themes` `ThemeProvider` wrapper

**`src/components/providers.tsx`** — `ThemeProvider` (`defaultTheme="dark"`, `enableSystem`) + `TooltipProvider`

**`src/components/theme-toggle.tsx`** — dropdown: Light / Dark / System

---

## Phase 12 — Hooks

**`src/hooks/use-media-query.tsx`** — `matchMedia` hook; used by `ResponsiveDialog` to switch between Dialog and Drawer

**`src/hooks/use-debounce.tsx`** — generic debounce hook; used by `CustomLinkForm` for slug availability check

---

## Phase 13 — QR Code Library

**No npm install.** The library is vendored — the source code of `qrcode.react` is copied directly into the project. This avoids a runtime dependency and allows customization without forking.

Copy the source into `src/lib/qrcode/` as two files:
- `qrcodegen.ts` — core QR algorithm; add `/* eslint-disable */` + `// @ts-nocheck` at the top so ESLint and TypeScript never check this file
- `index.tsx` — React wrapper; exports `QRCodeSVG`, `QRCodeCanvas`, `getQRAsSVGDataUri`, `getQRAsCanvas`

---

## Phase 14 — Layout & App Shell

### 14.1 `src/app/layout.tsx`

```typescript
// Root layout: Geist fonts, dark SSR default
<html lang="en" className="dark" suppressHydrationWarning>
  <body>
    <Providers>
      <Header />
      {children}
      <Footer />
      <Toaster />
    </Providers>
  </body>
</html>
```

### 14.2 `src/components/layout/header.tsx` (Server Component)

Shows app logo + `ThemeToggle` + `UserProfile` (async RSC).

### 14.3 `src/components/layout/footer.tsx`

Static footer with links.

---

## Phase 15 — Auth UI Components

**`src/components/auth/signin-dialog.tsx`** — `ResponsiveDialog` with GitHub + Google `OAuthProviderButton`s

**`src/components/auth/oauth-provider-button.tsx`** — Client Component (`"use client"` required — calls `signIn("github")` / `signIn("google")` from `next-auth/react`); button with provider icon (`Icons.github` / `Icons.google`)

**`src/components/auth/user-profile.tsx`** (async RSC) — reads session:
- If authenticated: shows `Avatar` + `UserProfileDropdown`
- If not: shows `SigninDialog`

**`src/components/auth/user-profile-dropdown.tsx`** — dropdown with user name/email, sign out button

---

## Phase 16 — Link Components

### 16.1 `LinkForm` (Client Component)

- `react-hook-form` + `zodResolver` with inline schema `{ url: z.string().url() }`
- Calls `createShortLink` via `useAction`
- On success: reset form, show toast
- On error: call `setFormErrors` for field errors, or toast for `serverError`
- Accepts `renderCustomLink: React.ReactNode` slot — renders the custom slug trigger button

### 16.2 `CustomLinkButton` (Client Component)

- Shown inside `LinkForm` via the `renderCustomLink` slot
- Opens `CustomLinkDialog` (wrapped in `ProtectedElement`)

### 16.3 `CustomLinkDialog` / `CustomLinkForm`

- `ResponsiveDialog` with a text input for custom slug
- Debounced `checkSlug` call via `useAction` on input change — shows availability feedback (available / taken / checking)
- Passes the chosen slug back to `LinkForm` via an `onSlugChange: (slug: string) => void` callback prop; `LinkForm` stores it in local `useState` and passes it to `createShortLink` on submit
- On dialog close without confirming, the slug is cleared

### 16.4 `LinkList` (async RSC)

Fetch strategy:
- Authenticated: `getUserLinkByUserId(session.user.id)` → all links
- Guest with cookie: `getLinksByUserLinkId(userLinkIdCookie)` → last 24h only
- Guest with no links: also fetch `getLinkBySlug("github")` to show example

Renders each link as `<LinkCard>`. Individual cards are NOT wrapped in their own `<Suspense>` — the `<Suspense>` boundary wrapping the entire `<LinkList>` lives in `page.tsx` (see Phase 17). `LinkCard` is a Server Component in the same RSC tree.

### 16.5 `LinkCard` (Server Component)

Displays a single link:
- Favicon: `https://t3.gstatic.com/faviconV2?...&url={url}&size=32` (via `next/image`)
- Click count via `formatNumber()` (compact)
- Relative time via `date-fns` `formatDistanceToNowStrict`; full date in `Tooltip`
- `LinkCopyButton`, `LinkOptionsDropdown`
- **Protected slug `"github"`**: no delete button, no relative time badge — never delete or overwrite

### 16.6 `LinkCopyButton` (Client Component)

Copies the short URL to clipboard. Shows success/error toast via sonner.

### 16.7 `LinkOptionsDropdown` (Client Component)

Dropdown menu with: Edit (`CustomLinkDialog`), QR Code (`LinkQRCodeDialog`), Delete (`DeleteLinkDialog`).

- **Edit** is wrapped in `ProtectedElement` — requires authentication (`editShortLink` is `authAction`)
- **Delete** is NOT wrapped in `ProtectedElement` — `deleteShortLink` is an open `action`; ownership is verified via session or `user-link-id` cookie, so guests can delete their own links too
- **QR Code** is available to everyone — no auth required

### 16.8 `DeleteLinkDialog`

`AlertDialog` confirming deletion. Calls `deleteShortLink` via `useAction`.

### 16.9 `LinkQRCodeDialog`

- Display: `QRCodeSVG` at 256px, error correction level `Q`
- Export: generate at 1024px via `getQRAsCanvas` (PNG, JPEG) and `getQRAsSVGDataUri` (SVG)
- Copy PNG to clipboard via `ClipboardItem` + `navigator.clipboard.write`
- Download via hidden `<a>` ref with programmatic click

---

## Phase 17 — Home Page

### `src/app/page.tsx`

Single user-facing route. Uses Partial Prerendering (PPR).

`Header` and `Footer` live in `src/app/layout.tsx` — they are part of the static layout shell, not `page.tsx`. `page.tsx` only contains:

```
page.tsx (static shell):
  └── LinkForm + CustomLinkButton   ← static, rendered immediately
  └── <Suspense fallback={<LinkListSkeleton />}>
        └── LinkList                ← dynamic RSC, streamed in after shell
      </Suspense>

layout.tsx (wraps all routes):
  └── Header                        ← static
  └── {children}                    ← page.tsx content above
  └── Footer                        ← static
  └── Toaster
```

---

## Phase 18 — Cron API Route

### `src/app/api/cron/route.ts`

```
GET /api/cron
Authorization: Bearer <CRON_SECRET>
```

1. Verify `Authorization` header → return `401` if missing or wrong
2. `deleteExpiredLinks()` — delete links for anonymous `userLink`s older than 1 day
3. `deleteExpiredUserLinks()` — delete anonymous `userLink`s older than 30 days
4. Return `200 { message: "Cleanup complete" }`

Configure in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 0 * * *" }]
}
```

---

## Phase 19 — Vercel Deployment

1. Push repo to GitHub
2. Apply schema to production Turso DB: `pnpm db:push` (run once before first deploy)
3. Import into Vercel
4. Set all production environment variables in Vercel (see Phase 2):
   - Do **NOT** add `NEXTAUTH_URL` — it is dev-only; Vercel infers the production URL automatically
   - Do add `NEXTAUTH_SECRET` — it is required in production
5. Configure GitHub and Google OAuth apps to allow the production callback URLs:
   - `https://<domain>/api/auth/callback/github`
   - `https://<domain>/api/auth/callback/google`
6. Enable Vercel Analytics (optional)
7. Verify cron job runs daily at midnight UTC (`0 0 * * *`)

---

## Phase 20 — Testing (Future)

No tests are configured yet. When introduced, use:

| Type | Tool |
|---|---|
| Unit / Integration | Vitest + React Testing Library |
| E2E | Playwright |
| API / data mocking | MSW |

Priority test targets:
- `src/lib/utils.ts` — `cn()`, `formatNumber()`, `setFormErrors()`, `getBaseUrl()`
- `src/lib/validations/link.tsx` — schema edge cases
- `src/server/actions/link.ts` — mock Drizzle + Redis, assert `revalidatePath` calls
- `linkMiddleware` — mock Redis; verify redirect vs. pass-through
- UI flows — link creation (guest + auth), delete, edit, QR code dialog

---

## Key Design Constraints

- **No global state library** — Zustand, Redux, TanStack Query are all absent. State = RSC re-renders + `revalidatePath`
- **No i18n** — English only, `lang="en"` hardcoded
- **No email auth** — GitHub + Google OAuth only
- **Slugs stored lowercase in Redis** — always `slug.toLowerCase()` on write; DB uses `COLLATE NOCASE`
- **URLs stored URL-encoded** — `encodeURIComponent` on write, `decodeURIComponent` on redirect
- **Guest TTL** — Redis: 24h (`ex: 86400`); DB cleanup: daily cron
- **Protected slug `"github"`** — built-in showcase link, never delete or overwrite
- **`drizzle/enforce-delete-with-where`** — every `.delete()` and `.update()` must have `.where()`
- **`noUncheckedIndexedAccess: true`** — always guard array/object index access with `if (first) { ... }`
