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
`:root` and overridden for dark mode; themes are Light, Dark and System (default).

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
