# Design System — "Blueprint"

## Overview

Blueprint is a single-accent, neutral-scale product design system. One blue — **`#1868db`** — carries every call to action, link, focus ring, and selected state. Everything else is black and white in their tones: a gray scale from `#ffffff` to `#171717`, plus one deliberate exception: the six-hue label palette. There are no gradients, no pastel washes, no decorative color outside that palette. Depth comes from **1px hairline borders** on white surfaces over a faintly gray page; shadows are minimal, neutral, and reserved for lifted states (drag, sheets).

Information density is the point. Type is compact (14px body, 16px ceiling), controls share one geometry (36px tall, 6px radius), spacing is tight, and related content lives inside a single bordered surface divided by hairlines — never scattered in floating bands.

**Key characteristics:**

- One accent: `{colors.primary}` `#1868db` for CTAs, links, focus, selection. Never decoration.
- Neutral everything else: white surfaces, gray hairlines, near-black ink.
- Hairline-border depth: `1px {colors.mist}` borders define surfaces; shadows are a whisper.
- Subtle radii: 4–12px. **No pill shapes.**
- One control box: buttons and inputs are both 36px tall, 6px radius, 13px label — they always line up.
- Compact type: 14px/400 body, 500-weight titles, 16px hard ceiling, tabular numerics.
- Functional red/green exist **only** as states (error/destructive, success) outside the label palette — never as decoration elsewhere.
- Micro-animations stay: 120–150ms transitions, GSAP stagger/drawer/drag choreography.

## Colors

Every color enters as a token in `app/globals.css` with a light and a dark value. Token _names_ are stable across reskins — components reference names, values move.

### Brand

- **Primary** (`--color-midnight` / alias `--color-electric-blue` — `#1868db`): the only CTA/link/focus color.
- **Primary Hover** (`--color-midnight-hover` — `#1259c4`) · **Primary Pressed** (`--color-midnight-pressed` — `#0f4aa3`).
- **Primary Soft** (`--color-primary-soft` — `#4c8fe8`): chart/accent tint inside product UI.
- **Primary Tint** (`--color-electric-blue-tint` — `#e8f0fc`): pale blue wash for selected/insight surfaces.
- **Muted avatar** (`--color-avatar-muted` / `--color-avatar-muted-ink` — `#d0e0f7` on `#0f4aa3`): the skin for members who aren't on the current board. A dedicated pair because the generic tint + link-blue combination only clears AA in light mode.

**Surface blues vs. text blues.** `--color-midnight` is only ever a _surface_ under white text (primary button, member avatar), so it stays `#1868db` in dark mode — lightening it drops white-on-blue below 4.5:1. Blue that is _text or an icon_ uses `--color-electric-blue`, which lightens to `#4c8fe8` in dark. Same rule for red: `--color-coral` is the text/state red and lightens; `--color-coral-solid` is the badge surface under white text and does not.

### Neutrals

- **Ink** (`--color-ink` — `#171717`): primary text. **Ink Secondary** (`#404040`) · **Smoke** (`#666666`) · **Fog/Ash** (`#8a8a8a`).
- **Paper** (`--color-paper` — `#ffffff`): raised surface. **Snow** (`#fafafa`): page background. **Sunken** (`#f2f2f2`): recessed wells (kanban columns, hovers). **Cream** (`#f5f5f5`): neutral band (legacy name).
- **Mist** (`--color-mist` — `#e5e5e5`): hairline borders. **Border Strong** (`#d4d4d4`): input borders.

### Functional states (the only non-blue/gray colors)

- **Error / destructive** (`--color-coral` — `#dc2626`) with wash `--color-blush` (`#fdecec`), plus `--color-coral-solid` (`#dc2626`, both themes) for count badges with white text.
- **Success** (`--color-success` / `--color-leaf` — `#16a34a`).
- **Due soon** (`--color-due-soon` — `#525252`): stays neutral; overdue uses coral.
- **Priority chevrons** (`lib/priority.ts`, Jira-style): Highest `#dc2626` · High `#ea580c` · Medium `#d97706` · Low `#1868db` · Lowest `#4c8fe8`. Urgency is state, so hot levels burn red/orange and calm levels cool back into the brand blues. Rendered only by `PriorityIcon` (`app/_components/priority-icon.tsx`).

These appear only on states (alerts, destructive buttons, overdue badges, success dots, priority chevrons) — never as decoration, backgrounds, or label colors.

### Label palette — real, distinguishable hues

Card labels are **the one decorative color surface in the app** — the single deliberate exception to the "blue and gray only" rule. Six real hues, chosen for contrast against each other rather than brand harmony, each with a solid (chip border/dot) and a subtle fill (chip background):

| Token          | Solid     | Subtle fill |
| -------------- | --------- | ----------- |
| `label-blue`   | `#1868db` | `#e8f0fc`   |
| `label-purple` | `#7c3aed` | `#ede9fe`   |
| `label-green`  | `#16a34a` | `#dcfce7`   |
| `label-red`    | `#e11d48` | `#ffe4e6`   |
| `label-yellow` | `#ca8a04` | `#fef9c3`   |
| `label-orange` | `#ea580c` | `#ffedd5`   |

Board tiles (`lib/board-colors.ts`) and kanban column accent dots (`lib/labels.ts#columnAccentColor`) also cycle through these subtle/solid fills for a stable, theme-aware tint — flat, ink text on top in light and dark.

Because labels use real red and green, the "red/green mean error/success only" rule below applies everywhere **except** label swatches, chips, and anything deriving from them (column dots, board tiles).

## Typography

**Inter** (via `--font-inter`), falling back to SF Pro Display / system-ui. Body weight 400; titles weight 500. No stylistic sets; `tnum` (the `.tabular` class) on every numeric cell.

### App scale (IMPORTANT — compact type)

Stackboard renders **small type everywhere** (explicit product decision — do not reintroduce large display sizes):

| App role                    | Size    | Weight | Letter Spacing | Notes                                  |
| --------------------------- | ------- | ------ | -------------- | -------------------------------------- |
| Page title (h1)             | 16px    | 500    | -0.2px         | The largest type in the app            |
| Section title / sheet title | 15px    | 500    | -0.1px         | Card detail title, settings sections   |
| Card / tile title           | 14px    | 500    | -0.1px         | Board tiles, kanban card titles        |
| Body                        | 14px    | 400    | 0              | Default body (`body` element)          |
| Control label               | 13px    | 500    | 0              | Buttons, inputs, filters               |
| Caption / metadata          | 12px    | 400    | -0.2px         | Badges, due dates, helper text         |
| Chip / counter              | 10–11px | 500    | 0              | Label chips, WIP counters              |
| Numeric cells               | any     | —      | -0.2px         | Always `tnum` via the `.tabular` class |
| Eyebrow                     | 10px    | 500    | +0.08em        | All-caps section labels                |

**Never** exceed 16px for any text. Hierarchy comes from weight (400 body vs 500 titles), color (ink vs smoke vs fog), and spacing — not size. Never bump a title above weight 600.

## Layout

- **Base unit**: 8px, with 2/4/12 sub-steps. Dense by default: section gaps 16–24px (`gap-4`/`gap-6`), card internal padding 12–16px.
- **Surfaces hold content together**: related sections live inside one bordered surface separated by hairlines (`divide-y`), not as separate floating cards.
- **Two-column detail views**: main content left, sticky properties sidebar (~280px) right (see card detail).
- Full use of width: pages cap at `max-w-6xl`, not narrow centered columns with dead space.

## Elevation & Depth

| Level | Treatment                                     | Use                       |
| ----- | --------------------------------------------- | ------------------------- |
| 0     | Flat `{colors.snow}` page                     | Background                |
| 1     | `{colors.paper}` + 1px `{colors.mist}` border | Cards, panels, sidebars   |
| 2     | Level 1 + `--shadow-subtle` (black 5%)        | Interactive cards at rest |
| 3     | `--shadow-dragging` (black 12%, 24px blur)    | Drag overlays, hover lift |
| 4     | `--shadow-sheet` (black 16%, 40px blur)       | Drawers / sheets          |

Borders are the primary depth cue. Shadows are neutral black rgba — never colored, never navy.

## Shapes

| Token                 | Value | Use                     |
| --------------------- | ----- | ----------------------- |
| `--radius-tags`       | 4px   | Chips, badges, counters |
| `--radius-inputs`     | 6px   | Inputs, selects         |
| `--radius-buttons`    | 6px   | All buttons             |
| `--radius-cards`      | 8px   | Cards, alerts           |
| `--radius-largecards` | 10px  | Feature cards, columns  |
| `--radius-sheet`      | 12px  | Drawer / sheet chrome   |

Radii are subtle. **Nothing is pill-shaped** except things that are truly circular (avatars, status dots).

## Components

### The control system

Buttons and inputs share one geometry so they always align in toolbars and forms:

- **Height**: `--control-h` 36px (default), `--control-h-sm` 28px (`.btn--sm`), 32px for board-toolbar buttons (`.btn-onboard`) and icon buttons.
- **Label**: 13px / 500. **Radius**: 6px. Callers never override geometry — pick a variant/size instead.
- **Never stretch**: buttons are `width: fit-content`, so flex/grid parents cannot stretch them. The rare full-width case (auth submit) passes `w-full` explicitly.
- Component classes live in `@layer components`, so Tailwind utilities override them cleanly — `!important` hacks are never needed.

**`btn-primary`** — filled `{colors.primary}`, white text. Hover `{primary-hover}`, active `{primary-pressed}`. **One per view region.**

**`btn-secondary` / `btn-outline`** — white surface, `{border-strong}` hairline, ink text; hover `{sunken}`. The workhorse neutral button.

**`btn-destructive`** — white surface, coral text + border; hover `{blush}` wash. Destructive actions only.

**`btn-ghost`** — borderless, smoke text → ink on hover. Inline/tertiary actions.

**`btn-icon`** — 32px square (28px `sm`), fog icon → ink on sunken hover.

**`btn-onboard` / `--dashed`** — 32px neutral toolbar buttons for board headers.

### Inputs

**`.input`** — white, `{border-strong}` 1px, 6px radius, 13px text, min-height 36px (grows for textareas). Focus: 2px `{colors.primary}` ring. Same box as buttons.

### Cards & containers

**`elevated-surface`** — paper + mist hairline + whisper shadow. The standard card.
**`card-surface`** — paper + mist hairline, 16px padding. Grouping band.
**Section stacks** — one bordered surface + `divide-y divide-mist`, sections `p-4`.

### Chips

**`.pill`** (legacy name) — 4px radius, 11px/500, `2px 8px` padding. Label chips use tonal `-subtle` fills with a 45% solid inset ring.

### Signature details

- **Tabular numerics** — every count/date/progress uses `.tabular`.
- **Micro-animations** — 120–150ms color/transform transitions; GSAP stagger-in on dashboards, drawer slide, drag rotate/scale on kanban. Respect `prefers-reduced-motion`.
- **Focus** — always the 2px blue `:focus-visible` ring.

## Dark mode

The brand maps onto a neutral dark track — grays, never navy or blue-tinted surfaces:

- Page `#0f0f0f`, paper `#161616`, sunken `#1d1d1d`, hairlines `#262626`/`#333`.
- Primary lightens to `#3b82e0`→`#4c8fe8`; tint becomes `rgba(24,104,219,0.16)`.
- Label subtle fills flip to deep tints; functional states brighten (`#f87171`, `#4ade80`).
- All dark values live in the single `@media (prefers-color-scheme: dark)` block in `app/globals.css`. Components never use `dark:` variants or hardcoded hex — if a new token has no dark value yet, derive one before shipping.

## Do's and Don'ts

### Do

- Reserve `#1868db` for CTAs, links, focus, and selected states — one filled button per view region.
- Build depth with hairline borders on paper over snow.
- Keep type small — 16px ceiling; hierarchy via weight 400/500 and gray steps.
- Use `.tabular` on every numeric cell.
- Group related sections in one bordered surface with hairline dividers.
- Keep every color a token with light + dark values in `globals.css`.

### Don't

- Don't introduce any color beyond blue tones, gray tones, and the two functional states — except the six-hue label palette above, which is the one sanctioned decorative exception.
- Don't use gradients, pastel washes, or mesh backgrounds — they are gone.
- Don't use pill radii on buttons, inputs, or chips.
- Don't override control geometry (`!p-0`, `h-9`, `min-h-0`) from callers — extend the Button/`.input` system instead.
- Don't use red/green decoratively outside the label palette; elsewhere they mean error/success only.
- Don't float content in disconnected bands with 40px gaps — surfaces and hairlines hold layouts together.
- Don't render numeric cells without `tnum`.

## Iteration Guide

1. Focus on ONE component at a time.
2. Reference tokens by name (`--color-midnight`, `--radius-buttons`, `.btn-primary`); change values, not names, when reskinning.
3. Default body is 14px/400; titles 15–16px/500; controls 13px/500.
4. New controls adopt the 36px control box; new chips adopt the 4px tag radius.
5. Keep the compact app type scale — never reintroduce large display sizes.
6. Every new color token ships with a dark value in the single dark block of `app/globals.css`.
