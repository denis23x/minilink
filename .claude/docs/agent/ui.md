# UI Layer

## shadcn/ui Configuration

- **Style**: `new-york` (configured in `components.json`)
- **Base color**: `neutral`
- **CSS variables**: enabled (all colors are HSL CSS custom properties)
- **RSC**: `true` — components support React Server Components

When adding new shadcn components:

```bash
pnpm dlx shadcn-ui add <component>
```

Always use `new-york` style and `neutral` base — do not change these.

## Installed shadcn/ui Components (`src/components/ui/`)

| File                    | Component(s)                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `alert-dialog.tsx`      | `AlertDialog` and sub-components (Radix)                                                          |
| `avatar.tsx`            | `Avatar`, `AvatarImage`, `AvatarFallback` (Radix)                                                 |
| `button.tsx`            | `Button` (CVA variants: default, destructive, outline, ghost, link; sizes: default, sm, lg, icon) |
| `card.tsx`              | `Card`, `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription`                 |
| `dialog.tsx`            | `Dialog` and sub-components (Radix)                                                               |
| `drawer.tsx`            | `Drawer` and sub-components (vaul)                                                                |
| `dropdown-menu.tsx`     | `DropdownMenu` and sub-components (Radix)                                                         |
| `form.tsx`              | `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` (react-hook-form)      |
| `heading.tsx`           | Custom `Heading` — see below                                                                      |
| `icons.tsx`             | `Icons` registry + `iconVariants` — see below                                                     |
| `input.tsx`             | `Input`                                                                                           |
| `label.tsx`             | `Label` (Radix)                                                                                   |
| `loader.tsx`            | `Loader` — loading spinner                                                                        |
| `protected-element.tsx` | `ProtectedElement` — see below                                                                    |
| `responsive-dialog.tsx` | `ResponsiveDialog` — see below                                                                    |
| `separator.tsx`         | `Separator` (Radix)                                                                               |
| `sonner.tsx`            | `Toaster` (sonner)                                                                                |
| `textarea.tsx`          | `Textarea`                                                                                        |
| `tooltip.tsx`           | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` (Radix)                          |

## Custom Components

### `ResponsiveDialog`

Context-based wrapper that renders a **`Dialog`** on desktop (≥ 768px via `useMediaQuery`) and a **`Drawer`** (vaul) on mobile.

```typescript
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogClose, // mobile (Drawer) only
  ResponsiveDialogContent,
  ResponsiveDialogFooter, // mobile (Drawer) only
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "~/components/ui/responsive-dialog";
```

`ResponsiveDialogFooter` and `ResponsiveDialogClose` only render on mobile. Use these for Drawer action buttons. Desktop dialogs manage their own close via the Dialog's built-in X button.

### `ProtectedElement`

Wraps any child with a `Tooltip` explaining authentication is required and disables the element when `session` is falsy.

```typescript
import { ProtectedElement } from '~/components/ui/protected-element'

<ProtectedElement session={session}>
  <Button>Edit</Button>
</ProtectedElement>
```

Use this for any UI action that requires authentication (editing, custom slugs, etc.).

### `Icons` and `iconVariants`

All icons are in `~/components/ui/icons`. Use the `Icons` object and size with `iconVariants`:

```typescript
import { Icons, iconVariants } from '~/components/ui/icons'

<Icons.Scissors className={iconVariants({ size: 'base' })} />
```

Available sizes (maps to Tailwind `w-X h-X`):

| Size   | Value       |
| ------ | ----------- |
| `xs`   | 3           |
| `sm`   | 3.5         |
| `base` | 4 (default) |
| `lg`   | 5           |
| `xl`   | 6           |
| `2xl`  | 7           |
| `3xl`  | 8           |
| `4xl`  | 9           |
| `5xl`  | 10          |

Available icons: `MoreVertical`, `Scissors`, `Copy`, `Eye`, `Sun`, `Moon`, `Trash2`, `Settings`, `Settings2`, `Pencil`, `LogOut`, `User`, `HelpCircle`, `Layers`, `Calendar`, `Link`, `QrCode`, `Clipboard`, `Download`, `Image`, `FileImage`, `FileCode2`, `Shuffle`, `github` (inline SVG), `google` (inline SVG).

### `Heading`

Semantic heading with variant prop:

```typescript
import { Heading } from '~/components/ui/heading'

<Heading variant="h1" isFirstBlock>Title</Heading>
```

`isFirstBlock` sets `mt-0` (removes top margin for the first heading on a page).

## Link Components (`src/components/links/`)

### `LinkCard`

**Server Component.** Displays a single short link with:

- Favicon fetched from `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url={url}&size=32`
- Click count formatted via `formatNumber()` (compact notation)
- Relative creation time via `date-fns` `formatDistanceToNowStrict`
- Full date in a `Tooltip`

**Protected slug `"github"`**: this slug is a built-in app showcase link. It receives no delete button and no relative time badge. Never delete or overwrite this slug.

### `LinkForm`

**Client Component.** The URL input form on the home page.

- Uses `react-hook-form` + `zodResolver` with its own inline schema `{ url: z.string().url() }` — this is **separate** from `insertLinkSchema` (which is the server-side action schema)
- Calls `createShortLink` via `useAction`
- On success: resets form, shows toast
- On error: calls `setFormErrors` to set field-level errors, or shows a toast for `serverError`
- Accepts a `renderCustomLink: React.ReactNode` prop — render slot for the custom slug button

### `LinkQRCodeDialog`

QR code generation for any link:

- **Display**: renders `QRCodeSVG` at `256px`
- **Export**: generates at `1024px` for download/copy
- **Error level**: `Q`
- **Formats**: PNG, JPEG (via `getQRAsCanvas`), SVG (via `getQRAsSVGDataUri`)
- **Copy to clipboard**: uses `ClipboardItem` + `navigator.clipboard.write` (PNG blob)
- **Download**: hidden `<a>` ref with programmatic click

## QR Code Library (`src/lib/qrcode/`)

Vendored copy of `qrcode.react`. The file has `/* eslint-disable */` and `// @ts-nocheck` at the top — do not type-check or lint this file.

Exports:

- `QRCodeSVG` — inline SVG, single `<path>` element
- `QRCodeCanvas` — `<canvas>`, DPR-aware
- `getQRAsSVGDataUri(options)` — returns `data:image/svg+xml,...` (sync)
- `getQRAsCanvas(options, type?)` — returns canvas data URL or canvas element (async)

## Tailwind

- **Dark mode**: class-based (`darkMode: ["class"]`)
- **Colors**: fully CSS variable-driven (HSL), defined in `src/styles/globals.css`
- **Border radius**: `--radius` CSS variable (`1rem` = `rounded-2xl` feel)
- **Container**: centered, `2rem` padding, `1400px` max at `2xl`
- **Plugin**: `tailwindcss-animate`
