# Design system rules

The files in `components/ui/*` ARE the design system installed by Better Design.

**Compose them. Never hand-roll a primitive the DS already ships.** Rebuilding
`Button` as a raw `<button>`, a table as a raw `<table>`, or faking a ⌘K palette,
account menu, or notification bell with bare `<div>`s is a bug even when it looks
right: it only matches because both read the same `app/globals.css` tokens, and the
faked interactive pieces end up dead (the search opens nothing, the menu has no
items, the bell does nothing).

Map each UI need to the installed component BEFORE writing markup:

- buttons, nav links (use `asChild`) -> `button`
- panels, cards, KPI tiles, section containers -> `card`
- tabular data -> `table` (not a raw `<table>`)
- status pills, tags, labels -> `badge`
- ⌘K / search palette -> `command` (`CommandDialog`)
- account / overflow / context menus -> `dropdown-menu`
- notification bell, flyouts -> `popover` + `notification`
- transient confirmations -> `use-toast` + `toaster`
- tooltips -> `tooltip` (wrap the app in `TooltipProvider`)
- modals -> `dialog`; tab switchers -> `tabs`; avatars -> `avatar`; dividers -> `separator`
- form fields -> `input` / `textarea` / `select` / `checkbox` / `switch` / `radio-group`

Read a component's source from `components/ui/` to learn its props/exports. Use only
the design tokens in `app/globals.css`; never invent colors, spacing, or radii.


## Icons — use Tabler Icons

This project's design system is paired with **Tabler Icons** icons (Iconify prefix `tabler`, variant `light`). Use this library for EVERY icon in the app. Do NOT use `lucide-react` or mix icon sets — that breaks visual consistency with the installed components.

Add icons as SSR-clean inline React components (no runtime CDN fetch, no first-paint flash): fetch each from `https://api.iconify.design/tabler/<name>.svg` and inline it as a component, or use the Better Design `install-icons` MCP tool when available. Avoid the runtime `<Icon icon="tabler:name" />` pattern.
