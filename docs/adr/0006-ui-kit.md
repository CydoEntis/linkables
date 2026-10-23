# ADR-0006: Tailwind CSS v4 and shadcn/ui for the web UI

**Status:** accepted (2026-10-22)

## Problem

The web app (and later the extension, which shares UI code) needs a styling layer
and accessible component primitives. The design brief and the coding agents must
work to the same kit.

## Options

1. **Tailwind CSS v4 + shadcn/ui (chosen).** Components are copied into the repo
   and owned, built on accessible headless primitives (Base UI by default since
   July 2026; Radix and React Aria also supported). Theme tokens are CSS variables
   exposed to Tailwind through `@theme inline`.
2. **A packaged component library (MUI, Mantine, Chakra).** Faster start, but the
   look is the library's, and restyling fights its theme system.
3. **Hand-written CSS and own primitives.** Full control; accessibility of menus,
   dialogs and comboboxes would be ours to get right.

## Decision

Use **Tailwind CSS v4** and **shadcn/ui** on its default Base UI primitives, with
**Lucide** icons. Colour, radius and font tokens use shadcn's semantic names
(`background`, `foreground`, `primary`, `muted`, `border`, `ring`, ...), defined in
`:root` and overridden for dark mode. The designer's handoff (`docs/design/handoff/`,
2026-10-22) is dark only, so Phase 1 ships the dark theme; Light and System come
back when a light theme is drawn.

**Web stack (owner decision, 2026-10-22).** These are the libraries for the web app
and, later, the extension. Use them for their job; don't add a second library for
the same job.

| Job | Library |
|---|---|
| Server state (anything from the API) | TanStack Query |
| Routing and URL state (search, filters, open link) | TanStack Router (code-based routes, typed search params validated with Zod) |
| Client-only UI state (open panels, selection, swipe, drafts) | Zustand, small stores per feature, never a copy of server data |
| Components | shadcn/ui on Base UI, Lucide icons |
| Styling | Tailwind CSS v4 with the design tokens |
| Validation and contracts | Zod, schemas shared from `packages/shared` |
| Forms | react-hook-form with `@hookform/resolvers/zod` |

**Forms** use react-hook-form with `@hookform/resolvers/zod` and shadcn's form field
components. Fields validate with the shared Zod schemas from `packages/shared`, the
same ones the API uses, so the client and server never disagree on a rule.

## Reasoning

- The owner chose it; it is the default path coding agents know best.
- Owning the component code means the design can restyle anything through tokens.
- shadcn's token names map one to one onto the design file's variables
  (`docs/design/BRIEF.md`, section 8).

## Tradeoffs

- Copied components do not update themselves; upgrades are manual diffs.
- Tailwind class lists get long; shared variants live in the component (via
  `cva`), not repeated in screens.

## Revisit when

- The extension needs a UI that Tailwind's output size or MV3's CSP makes awkward.
