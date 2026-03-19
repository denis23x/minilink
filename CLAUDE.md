# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project Docs

Detailed reference docs live in `.claude/docs/`. Load the relevant file when working in that area:

| File | When to load |
| ---- | ------------ |
| @.claude/docs/general.md | Code style, error handling, commit conventions |
| @.claude/docs/conventions.md | Naming, file structure, import order, TypeScript patterns |
| @.claude/docs/architecture.md | Data flow, redirect flow, route structure, env vars |
| @.claude/docs/api.md | Server API layer rules, action patterns, `useAction` usage |
| @.claude/docs/database.md | Schema details, CRUD patterns, Drizzle rules |
| @.claude/docs/agent/ui.md | shadcn/ui config, custom components, Tailwind setup |
| @.claude/docs/agent/state.md | State management approach and what NOT to add |
| @.claude/docs/agent/api.md | Full API reference (actions, functions, redirect) |
| @.claude/docs/agent/testing.md | Testing stack and priorities (no tests yet) |
| @.claude/docs/agent/i18n.md | i18n status (none) and future migration path |

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # ESLint

pnpm db:generate  # Generate Drizzle migrations
pnpm db:push      # Apply schema to Turso
pnpm db:studio    # Open Drizzle Studio
```

No test runner is configured yet (see plan.md Phase 20).

## Stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js App Router (canary/16), React 19, PPR       |
| Language   | TypeScript strict + `noUncheckedIndexedAccess`      |
| Package    | `pnpm`                                              |
| Database   | Turso (SQLite edge) + Drizzle ORM                   |
| Cache      | Upstash Redis (also drives slug redirects)          |
| Mutations  | `next-safe-action` + Zod                            |
| Auth       | NextAuth.js v4 + Drizzle adapter                    |
| UI         | shadcn/ui, Tailwind CSS v4, Radix UI, Lucide icons  |
| Hosting    | Vercel (daily cron at `/api/cron`)                  |

## Architecture Overview

Minilink is a URL shortener. There is one user-facing route (`/`); everything else is middleware-driven.

### Redirect Engine

`src/proxy.ts` (exported as middleware) intercepts all single-segment paths (e.g. `/abc123`). It delegates to `src/server/middlewares/linkMiddleware.ts`, which:
1. Checks Redis (`slug.toLowerCase()`) — fast path.
2. Fires a DB click-increment via `event.waitUntil()` (fire-and-forget).
3. Returns a 302 redirect, or `NextResponse.next()` if the slug is not found.

### Data Layer — `src/server/`

All Drizzle + Redis calls are encapsulated in `src/server/api/`. **Never call Drizzle directly from components or server actions.**

- `db/schema.ts` — all tables: `users`, `accounts`, `sessions`, `verificationTokens` (NextAuth), `userLinks` (ownership container), `links`.
- `db/index.ts` — Drizzle client (LibSQL → Turso).
- `redis.ts` — `Redis.fromEnv()`.
- `api/link.ts` — slug generation, create/read/update/delete, Redis sync.
- `api/user-link.ts` — ownership containers, guest → auth migration helpers, cookie management.
- `auth.ts` — NextAuth config; `signIn` event migrates guest links to the authenticated user.

### Server Actions — `src/server/actions/link.ts`

Two action clients from `src/lib/safe-action.ts`:
- `action` — open to anyone.
- `authAction` — requires a valid session; injects `{ user }` into handler context.

Actions always call `revalidatePath("/")` after mutations. Business errors use `MyCustomError` (not `Error`) so the message surfaces as `result.serverError` on the client.

### Guest vs. Authenticated Users

- Guest links are stored under a `userLink` with `userId = null` and identified by a `user-link-id` cookie.
- Redis keys for guest links have a 24-hour TTL (`ex: 86400`). A daily Vercel cron (`/api/cron`) prunes stale DB rows.
- On sign-in, the `signIn` event in `auth.ts` migrates the guest `userLink` (and its links) to the authenticated user and calls `redis.persist()` to remove the TTL.

### UI Components — `src/components/`

| Directory   | Contents                                                      |
| ----------- | ------------------------------------------------------------- |
| `ui/`       | shadcn primitives + custom: `ResponsiveDialog`, `Heading`, `Loader`, `ProtectedElement` |
| `auth/`     | `SigninDialog`, `OAuthProviderButton`, `UserProfile`, `UserProfileDropdown` |
| `links/`    | `LinkForm`, `LinkList`, `LinkCard`, `LinkCopyButton`, `LinkOptionsDropdown`, `CustomLinkDialog`, `DeleteLinkDialog`, `LinkQRCodeDialog` |
| `layout/`   | `Header`, `Footer`                                            |

`ResponsiveDialog` renders a Radix `Dialog` on desktop (≥768 px via `useMediaQuery`) and a `vaul` Drawer on mobile.

`ProtectedElement` wraps children in a `Tooltip` and disables interaction when no session exists.

### Path Alias

`~/` maps to `src/` (set in `tsconfig.json`).

### Key Design Constraints

- **Slugs lowercase in Redis** — always write/read with `slug.toLowerCase()`; DB uses `COLLATE NOCASE`.
- **URLs URL-encoded** — `encodeURIComponent` on write, `decodeURIComponent` on redirect.
- **Protected slug `"github"`** — built-in showcase link; never delete or overwrite it.
- **No global state** — no Zustand/Redux/TanStack Query; state flows through RSC re-renders + `revalidatePath`.
- **Drizzle ESLint rules** — every `.delete()` and `.update()` must have `.where()` (`drizzle/enforce-delete-with-where`, `drizzle/enforce-update-with-where`).
- **QR code library is vendored** — source is in `src/lib/qrcode/` (not an npm package); the algorithm file has `/* eslint-disable */` + `// @ts-nocheck`.

### Environment Variables

Validated at build time via `@t3-oss/env-nextjs` in `src/env.js`. `UPSTASH_*` and `CRON_SECRET` are read directly from `process.env` (not in `env.js`). `NEXTAUTH_URL` is dev-only — do not add it to Vercel.
