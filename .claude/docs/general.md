---
# No paths: field = loads every session for all files
---

# General Coding Rules

## Code Style

- Use TypeScript strictly — no `any` types without a comment explaining why
- Prefer `const` over `let`; never use `var`
- Use named exports; default exports only for Next.js `page.tsx`, `layout.tsx`, and route handlers
- Max line length: 120 characters
- Use early returns to avoid deep nesting

## Package Manager

- This project uses `pnpm` — never use `npm install` or `yarn add`
- Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`
- DB scripts: `pnpm db:generate`, `pnpm db:push`, `pnpm db:pull`, `pnpm db:studio`

## Error Handling

- Always handle promise rejections — use `try/catch` or `.catch()`
- Server actions throw `MyCustomError` for expected errors — always check `result.serverError`
- Log errors with context: `console.error('[ContextName]', error)`
- Never silently swallow errors

## Comments

- Write comments for *why*, not *what*
- Complex logic must have a comment explaining the approach
- TODO comments must include context: `// TODO: describe the issue`

## Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`
- Keep commits small and focused on a single change
