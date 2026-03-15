# Testing Guide

## Current Status

This project has **no test framework configured** at this time.
There are no unit, integration, or E2E tests in the codebase.

## Recommended Stack (if tests are added)

| Type               | Tool                           |
| ------------------ | ------------------------------ |
| Unit / Integration | Vitest + React Testing Library |
| E2E                | Playwright                     |
| API / data mocking | MSW (Mock Service Worker)      |

## Suggested Commands (once configured)

```bash
pnpm test                  # unit + integration
pnpm test:watch            # watch mode
pnpm test:coverage         # with coverage report
pnpm test:e2e              # E2E (requires dev server)
```

## What to Test (priorities if tests are introduced)

- **Utility functions** in `src/lib/utils.ts` — `cn()`, `formatNumber()`, `setFormErrors()`, `getBaseUrl()`
- **Validation schemas** in `src/lib/validations/link.tsx` — `insertLinkSchema`, `editLinkSchema`
- **Server actions** in `src/server/actions/link.ts` — mock Drizzle + Redis, assert `revalidatePath` calls
- **`linkMiddleware`** — mock Redis responses; verify redirect vs. pass-through behavior
- **Critical UI flows** — link creation (guest and authenticated), delete, edit, QR code dialog

## Gotchas (for future reference)

- Always `await userEvent` calls — they are async
- Prefer `screen.getByRole` over `getByTestId` — tests accessibility too
- Reset mocks in `beforeEach` — never let state leak between tests
- Drizzle client and Redis client should both be mocked — never hit real services in tests
- `revalidatePath` must be mocked in server action tests (`vi.mock('next/cache')` with Vitest)
