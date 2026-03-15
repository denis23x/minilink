# State Management

## Approach

This project has **no global state management library**. There is no Zustand, no TanStack Query, no Redux.

State is managed through three mechanisms:

| Mechanism                      | Used for                                          |
| ------------------------------ | ------------------------------------------------- |
| Next.js Server Components      | All data fetching (RSC reads from DB via Drizzle) |
| `revalidatePath("/")`          | Cache invalidation after mutations                |
| `useAction` (next-safe-action) | Client-side mutation loading state + callbacks    |
| `useState`                     | Local UI state (dialog open/close, form state)    |

---

## Server Components — Data Fetching

`LinkList`, `CustomLink`, and `UserProfile` are all `async` RSCs. They call `src/server/api/` functions directly — no hooks, no client libraries.

`LinkList` fetch strategy:

- **Authenticated**: `getUserLinkByUserId(session.user.id)` → returns `userLink.links` (all links, no expiry)
- **Guest**: reads `user-link-id` cookie → `getLinksByUserLinkId(userLinkIdCookie)` (last 24h only)
- **Guest with no links**: also fetches `getLinkBySlug("github")` to display a default example link

```typescript
// Actual pattern inside LinkList (async RSC)
const session = await getServerAuthSession();

if (session) {
  const userLink = await getUserLinkByUserId(session.user.id);
  return userLink?.links ?? [];
} else {
  const userLinkIdCookie = cookieStore.get("user-link-id")?.value;
  return userLinkIdCookie ? await getLinksByUserLinkId(userLinkIdCookie) : [];
}
```

---

## `revalidatePath` — Cache Invalidation

After any mutation, the server action calls `revalidatePath("/")` to bust the Next.js RSC cache and trigger a re-render of the entire server component tree:

```typescript
export const createShortLink = action(insertLinkSchema, async ({ url }) => {
  await generateShortLink({ url, ... })
  revalidatePath("/")
  return { message: "Link creation successful" }
})
```

---

## `useAction` — Client Mutations

Client components call server actions via `useAction` from `next-safe-action/hooks`. This provides loading state and success/error callbacks without any additional library:

```typescript
import { deleteShortLink } from "~/server/actions/link";
import { useAction } from "next-safe-action/hooks";

const { execute, status } = useAction(deleteShortLink, {
  onSuccess: () => toast.success("Deleted"),
  onError: ({ serverError }) => toast.error(serverError ?? "Error"),
});

// status: "idle" | "executing" | "hasSucceeded" | "hasErrored"
```

---

## Local `useState` — UI State

Dialogs, dropdowns, and form interactions use plain React state:

```typescript
const [open, setOpen] = useState(false);
```

`ResponsiveDialog` (renders as `Dialog` on desktop, `Drawer` on mobile) and all modal components manage their own open state locally.

---

## What NOT to Do

- Do **not** add Zustand or any global store — there is no shared client state that requires it
- Do **not** add TanStack Query — data fetching is handled by RSCs and `revalidatePath`
- Do **not** manage server data in client state — always trust the RSC re-render after `revalidatePath`
