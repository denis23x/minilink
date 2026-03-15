# Code Conventions

## Naming

| Thing        | Convention                       | Example                      |
| ------------ | -------------------------------- | ---------------------------- |
| Files        | kebab-case                       | `link-card.tsx`              |
| Components   | PascalCase                       | `LinkCard`                   |
| Hooks        | camelCase + `use` prefix         | `useMediaQuery`              |
| Utils        | camelCase                        | `formatNumber`               |
| Constants    | camelCase (local) / UPPER (env)  | `slugRegex`, `CRON_SECRET`   |
| Types        | PascalCase, inferred from schema | `ShortLink`, `UserLink`      |
| DB columns   | snake_case in SQL, camelCase in TS via Drizzle inference |
| Primary keys | `id` (text, cuid2) or `slug` (text, nanoid 6-char) |

## File Organization

```
src/
├── app/
│   ├── api/
│   │   └── cron/route.ts        # Daily cleanup cron endpoint
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home page (only user-facing route)
├── components/
│   ├── auth/                    # SigninDialog, UserProfile, UserProfileDropdown, OAuthProviderButton
│   ├── layout/                  # Header, Footer
│   ├── links/                   # LinkForm, LinkList, LinkCard, LinkCopyButton, LinkOptionsDropdown
│   │                            # CustomLink, CustomLinkButton, CustomLinkDialog, CustomLinkForm
│   │                            # DeleteLinkDialog, LinkQRCodeDialog
│   ├── ui/                      # shadcn/ui primitives + ResponsiveDialog, ProtectedElement, Heading, Icons
│   ├── providers.tsx            # ThemeProvider (defaultTheme="dark", enableSystem) + TooltipProvider
│   ├── theme-provider.tsx       # next-themes ThemeProvider wrapper
│   └── theme-toggle.tsx         # Dropdown: Light / Dark / System
├── hooks/
│   ├── use-debounce.tsx         # Generic debounce hook
│   └── use-media-query.tsx      # matchMedia hook
├── lib/
│   ├── config.ts                # Time constants (guest expiry durations)
│   ├── qrcode/                  # Vendored QR code library (qrcodegen.ts + index.tsx)
│   ├── safe-action.ts           # `action` + `authAction` clients (next-safe-action)
│   ├── utils.ts                 # cn(), getBaseUrl(), nanoid, formatNumber(), setFormErrors()
│   └── validations/link.tsx     # insertLinkSchema + editLinkSchema (drizzle-zod + Zod)
├── server/
│   ├── actions/link.ts          # Server actions: createShortLink, deleteShortLink, editShortLink, checkSlug
│   ├── api/
│   │   ├── link.ts              # DB + Redis CRUD for links
│   │   ├── user-link.ts         # DB CRUD for userLinks + cookie management
│   │   └── user.ts              # getUserById
│   ├── auth.ts                  # NextAuth config + signIn event hook
│   ├── db/
│   │   ├── index.ts             # Drizzle client (Turso)
│   │   └── schema.ts            # All table definitions + relations
│   ├── middlewares/
│   │   ├── index.ts
│   │   └── linkMiddleware.ts    # Slug lookup & redirect via Redis
│   └── redis.ts                 # Upstash Redis client
├── middleware.ts                # Next.js middleware → delegates to linkMiddleware
├── styles/globals.css           # CSS variable themes (light/dark)
├── types/index.ts               # UserWithLink, SafeActionError
└── env.js                       # @t3-oss/env-nextjs typed env schema
```

## Import Order

Enforced by `@ianvs/prettier-plugin-sort-imports` (see `prettier.config.js`):

```typescript
// 1. React
import { useState } from 'react';

// 2. Next.js
import { revalidatePath } from 'next/cache';

// 3. Third-party packages
import { z } from 'zod';

// 4. ~/types/
import type { ShortLink } from '~/types';

// 5. ~/lib/
import { GUEST_LINK_EXPIRE_TIME } from '~/lib/config';
import { cn } from '~/lib/utils';

// 6. ~/hooks/
import { useMediaQuery } from '~/hooks/use-media-query';

// 7. ~/components/ui/
import { Button } from '~/components/ui/button';

// 8. ~/components/
import { LinkCard } from '~/components/links/link-card';

// 9. ~/styles/
import '~/styles/globals.css';

// 10. Relative imports
import { something } from './local-module';
```

Path alias: `~/` maps to `src/`.

## ESLint Rules (`.eslintrc.cjs`)

| Rule | Behavior |
| ---- | -------- |
| `consistent-type-imports` | **Enforce** `import type { X }` for type-only imports — never `import { X }` when X is only used as a type |
| `no-unused-vars` | Warn; `_`-prefixed variables and parameters are exempt |
| `drizzle/enforce-delete-with-where` | Error on `.delete()` without `.where()` |
| `drizzle/enforce-update-with-where` | Error on `.update()` without `.where()` |
| `no-misused-promises` | Error, but `checksVoidReturn.attributes: false` — async JSX event handlers are allowed |

```typescript
// ✅ correct
import type { ShortLink } from '~/server/db/schema'

// ❌ wrong — triggers consistent-type-imports
import { ShortLink } from '~/server/db/schema'
```

## TypeScript Patterns

`tsconfig.json` has `noUncheckedIndexedAccess: true` — array and object index access returns `T | undefined`. Always handle this:

```typescript
// ✅ correct
const first = items[0]
if (first) { ... }

// ❌ wrong — TypeScript error with noUncheckedIndexedAccess
const first: Item = items[0]
```

```typescript
// ✅ Infer types directly from Drizzle schema
export type ShortLink = typeof links.$inferSelect;
export type NewShortLink = typeof links.$inferInsert;

// ✅ Explicit return types on server API functions
export async function getLinksByUserLinkId(userLinkId: string): Promise<ShortLink[]>

// ✅ Use Zod schemas for all form/action input validation
export const insertLinkSchema = createInsertSchema(links).pick({ ... }).extend({ ... })

// ❌ Avoid implicit any
function process(data: any) { ... }
```
