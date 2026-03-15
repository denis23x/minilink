# Architecture Overview

## Key Architectural Decisions

- **Next.js App Router (canary)**: single-page app — the only user-facing route is `/` (home)
- **Server Components first**: `LinkList`, `CustomLink`, `UserProfile` are all async RSCs that fetch data directly from Drizzle
- **`next-safe-action`** wraps all mutations with Zod validation and typed error handling; `useAction` is the only client-side mutation hook
- **Upstash Redis** handles slug → URL lookup at the edge with sub-millisecond latency; all redirects bypass Next.js rendering entirely
- **Turso (SQLite edge DB)** via `@libsql/client` and Drizzle ORM is the single source of truth
- **No global state library** — state is managed via RSC re-renders (`revalidatePath("/")`), `useAction` loading state, and local `useState`
- **NextAuth.js v4** with the Drizzle adapter and database sessions; GitHub and Google OAuth only
- **Dark mode default** — `ThemeProvider` is set to `defaultTheme="dark"` with `enableSystem`; the `<html>` element starts with `className="dark"` as the SSR default before `next-themes` hydrates
- **No i18n** — the app is English-only; `lang="en"` is hardcoded in the root layout

## Data Flow

1. Server Component reads DB via `src/server/api/link.ts` (Drizzle query)
2. Client submits a form → `useAction(serverAction)` (next-safe-action)
3. Server action validates with Zod, mutates DB + Redis, calls `revalidatePath("/")`
4. Next.js re-fetches and re-renders the RSC tree

## Redirect Flow (Middleware)

Every request hits `src/middleware.ts` → `linkMiddleware`. The matcher **excludes**:

- `/api/` routes
- `/_next/` (Next.js internals)
- `/_proxy/`, `/_static`, `/_vercel` (Vercel internals)
- Static files (e.g. `/favicon.ico`, `*.xml`, `*.txt`)

For all other paths:

1. Extract slug from pathname (e.g. `/abc123`)
2. Look up slug in **Upstash Redis** (primary fast path) and **atomically increment `clicks`** in DB — both in parallel
3. If URL found → `302` redirect to decoded URL
4. If not found → `NextResponse.next()` — falls through to the Next.js home page

## Route Structure

```
src/app/
├── api/
│   └── cron/route.ts   # Daily cleanup job (requires CRON_SECRET bearer token)
├── layout.tsx           # Root layout: Geist fonts, Header, Footer, Providers, Toaster
└── page.tsx             # Home page — the only user-facing route
```

## Next.js Config (`next.config.js`)

| Setting                   | Value            | Effect                                                                                 |
| ------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `experimental.ppr`        | `true`           | Partial Prerendering enabled — static shell + dynamic `<Suspense>` boundaries streamed |
| `images.remotePatterns`   | `t3.gstatic.com` | Required for `next/image` to load favicons in `LinkCard`                               |
| `logging.fetches.fullUrl` | `true`           | Logs full URLs for all fetch calls in dev                                              |

## External Services

| Service       | Purpose                                       |
| ------------- | --------------------------------------------- |
| Turso         | SQLite edge database (via `@libsql/client`)   |
| Upstash Redis | Slug → URL store; guest link TTL (24h)        |
| NextAuth.js   | OAuth authentication (GitHub, Google)         |
| Vercel        | Hosting, CI/CD, Analytics, daily cron trigger |

## Environment Variables

| Variable                   | Required        | Purpose                                          |
| -------------------------- | --------------- | ------------------------------------------------ |
| `TURSO_URL`                | yes             | Turso DB connection URL                          |
| `TURSO_AUTH_TOKEN`         | yes             | Turso JWT auth token                             |
| `UPSTASH_REDIS_REST_URL`   | yes             | Upstash Redis REST URL (read by `Redis.fromEnv`) |
| `UPSTASH_REDIS_REST_TOKEN` | yes             | Upstash Redis REST token                         |
| `NEXTAUTH_URL`             | dev only        | OAuth callback base URL                          |
| `NEXTAUTH_SECRET`          | production only | JWT signing secret                               |
| `GITHUB_ID`                | yes             | GitHub OAuth App client ID                       |
| `GITHUB_SECRET`            | yes             | GitHub OAuth App secret                          |
| `GOOGLE_CLIENT_ID`         | yes             | Google OAuth client ID                           |
| `GOOGLE_CLIENT_SECRET`     | yes             | Google OAuth client secret                       |
| `DOMAIN_URL`               | optional        | Production domain for base URL construction      |
| `CRON_SECRET`              | yes             | Bearer token for `/api/cron` authorization       |

All server-side variables (except `UPSTASH_*` and `CRON_SECRET`) are validated at build time via `@t3-oss/env-nextjs` in `src/env.js`.
