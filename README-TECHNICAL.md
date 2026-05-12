# README-TECHNICAL

A guide for developers working on **Magic Eight Ball**. The user-facing
[`README.md`](./README.md) describes the product; this file describes how the
code is organized, the conventions that are already in place, and the rules
future changes are expected to follow.

> **Scope.** Everything in this document reflects patterns that exist in the
> codebase today. When a rule says "always" or "never," it is because the
> existing code already does. If you find a counterexample, the counterexample
> is a bug — either fix the code or update this document, but do not split the
> difference.

---

## 1. Hard rules

### 1.1 The 700-line limit

**No code file may exceed 700 lines.** This applies to *every* file checked
into source control that contains code, including:

- `*.ts`, `*.tsx`
- `*.css` (and any future `*.scss`, `*.module.css`, etc.)
- `*.rs`
- `*.json` config when hand-edited (e.g. `tauri.conf.json`)
- HTML, shell scripts, GitHub workflow YAML

Generated files (`package-lock.json`, `Cargo.lock`, `dist/`) are exempt.

When a file approaches 700 lines, **stop adding to it and refactor first**.
Acceptable refactors:

- Extract a sub-component into its own file under `src/components/`.
- Move a cohesive group of pure helpers into a new module (e.g.
  `src/state/dateMath.ts`).
- Split a CSS file by feature area (e.g. `styles/inspector.css`,
  `styles/canvas.css`) and import them all from a top-level entry.

Refactoring should preserve behavior — a 700-line split is not an opportunity
to redesign the feature.

#### Current state

At the time of writing, one file is already over the limit:

| File | Lines | Action |
| --- | --- | --- |
| `src/styles.css` | 1151 | Must be split before the next non-trivial styling change. Section comments (`/* ----- Inspector ----- */`, `/* ----- Lanes ----- */`, etc.) already mark natural cut points. |

Treat this as the one grandfathered exception. Do not introduce more.

### 1.2 Type safety is non-negotiable

`tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, and `forceConsistentCasingInFileNames`. Do not
relax any of these flags. Do not silence errors with `// @ts-ignore` or
unchecked `as any` casts. `tsc -b` is the gate that runs in CI via
`npm run build` — if it fails, the change does not ship.

The only `as` casts in the codebase narrow `unknown` from external boundaries
(persisted state in `store.ts`'s `migrate`, file imports in
`importSnapshot`) or refine DOM types after `closest()` lookups. New casts
should match that pattern.

### 1.3 Never bypass safety checks

Do not use `--no-verify`, `--no-gpg-sign`, or `eslint-disable` blanket
comments. If a hook or check is failing, fix the root cause.

---

## 2. Architecture at a glance

```
src/
  main.tsx                React 18 entry, StrictMode wrapper
  App.tsx                 Three-pane shell (sidebar, canvas, inspector)
  types.ts                Domain types (Layer, DateMark, Person, Group)
  styles.css              All styling (see 1.1 — needs splitting)
  state/
    store.ts              Zustand store + pure layout/date helpers
  components/
    Canvas.tsx            Scrollable canvas, drag-to-create, drop targeting
    LayerSidebar.tsx      Left tree, custom drag-and-drop, export/import
    Inspector.tsx         Right detail panel
    LayerBar.tsx          A single Gantt-style span
    DateMarker.tsx        A single date (dot or full-height line)
    BirthdayMarker.tsx    Annual birthday dots for a Person
    TimelineGrid.tsx      Sticky header: years + month cells
    YearDividers.tsx      Full-height vertical year separators
    TodayMarker.tsx       Red "today" line
    CursorTooltip.tsx     Hovering date readout
    AddMenu.tsx           + button flyout
    ZoomSlider.tsx        Zoom radio group
    InlineLabelEditor.tsx Shared inline rename input
    icons/EyeIcons.tsx    Visibility SVGs
src-tauri/                Thin Rust shell — frontend served from ../dist
```

### 2.1 State

There is **one store**, `useStore`, defined in `src/state/store.ts`. It uses
Zustand's `persist` middleware backed by `localStorage`. Rules:

- **All mutations go through actions on the store** (`addLayer`, `updateDate`,
  `removeItem`, etc.). Components never reach into another component's state.
- **Selectors are narrow**: subscribe to the smallest slice you need
  (`useStore((s) => s.layers)`), never the whole store. This is how
  re-renders stay localized.
- **Persisted shape is whitelisted** via `partialize`. Transient UI state
  (`selectedId`, `inspectorOpen`, `scrollToTarget`) is intentionally
  excluded. If you add a field that should outlive a refresh, add it to
  `partialize`.
- **Schema changes bump `version` and add a `migrate` case.** The pattern is
  in place — follow it. Never silently drop a field; either preserve it or
  write a migration that derives a sensible default.

### 2.2 Pure helpers live next to the store

`store.ts` exports pure functions (`dateToX`, `dateToEndX`, `xToDateParts`,
`daysInMonth`, `generateDateOccurrences`, `generateBirthdayOccurrences`,
`computeLanes`). These take their inputs as parameters and do not read from
the store. That is what makes them safe to memoize in components and what
will make them testable when tests are added. **Do not introduce date or
coordinate math elsewhere.** If a component needs a new calculation, add the
helper to `store.ts` (or a future `dateMath.ts` after the 700-line split)
and import it.

### 2.3 Domain types

All shared types live in `src/types.ts`. Every item type uses a
**discriminated union via `kind`** (`"layer" | "date" | "person" | "group"`),
which is what `Inspector` keys off of. New item kinds:

1. Add the type in `types.ts` with a `kind` literal.
2. Extend the `Item` / `Container` unions.
3. Add the corresponding `add*`, `update*`, and persistence wiring in
   `store.ts`.
4. Render a branch in `Inspector.tsx`.

---

## 3. Conventions already in force

### 3.1 Components

- **One default-exported component per file.** Files are named after the
  component (`Canvas.tsx`, `Inspector.tsx`).
- **Tightly coupled subcomponents live in the same file** as their parent
  (e.g. `LayerRow`, `DateRow`, `PersonGroup`, `GroupSection` are co-located
  in `LayerSidebar.tsx`). They do not get their own files unless they are
  reused elsewhere.
- **Props are declared inline** with a `Props` type or destructured object
  type. No `React.FC`.
- **Hooks order is stable.** Pull all `useStore` selectors at the top of the
  component, then local state, then refs, then effects, then handlers, then
  the JSX. Existing files all follow this shape — match it.

### 3.2 Memoization

- Use `useMemo` for derived data that is expensive or feeds child props
  (the canonical example is `computeLanes(...)` in `Canvas.tsx`).
- Use `useCallback` for handlers passed to child components so child
  identity doesn't churn (see `onLayerHoverChange`, `onDateDragChange`).
- Don't `useMemo` trivial expressions. The bar is "this would otherwise
  recompute every render and is observable."

### 3.3 Effects and global listeners

- Any `window`/`document` listener added in an effect **must return a
  cleanup**. Every existing effect does. Do not break the pattern.
- `document.body.style.userSelect` is saved and restored across a drag (see
  `LayerBar.tsx`, `DateMarker.tsx`). Preserve this when adding new drag
  interactions — otherwise text selection leaks across the page.
- The Escape-to-deselect handler lives in `App.tsx`. Global keyboard
  handling stays there.

### 3.4 Drag and drop — do **not** use HTML5 DnD

`LayerSidebar.tsx` has a comment explaining why:

> We use this rather than HTML5 drag-and-drop because HTML5 DnD is unreliable
> inside Tauri webviews.

All drag interactions follow the same recipe:

1. `onMouseDown` records a start point and a `kind/id` in component state.
2. A `useEffect` keyed on the drag state attaches `mousemove` and `mouseup`
   listeners to `window`.
3. Hit-testing for drop targets uses
   `document.elementFromPoint(x, y).closest("[data-drop-target-id]")`.
4. A `DRAG_THRESHOLD` (5 px) prevents accidental drags on a plain click.

Mark drop targets with `data-drop-target-id` and `data-drop-target-kind`.
Mark anything that should swallow a canvas mousedown (so the canvas doesn't
start drawing a span over a button) with `data-interactive`. The canvas
checks via `(e.target as HTMLElement).closest("[data-interactive]")`.

### 3.5 Selection

There is one selection: `selectedId: string | null` on the store. Rules:

- Clicking an item calls `setSelected(item.id)`.
- Escape clears it (`App.tsx`).
- Double-click on a label enters inline edit through `InlineLabelEditor`.
- "Scroll into view" goes through `requestScrollTo(id)`, which writes
  `{ id, nonce }`. The nonce changes on every request so re-targeting the
  same id still triggers the scroll. **Do not replace this with a plain
  string** — the nonce is load-bearing.

### 3.6 Inline editing

All rename UIs go through `InlineLabelEditor`. It:

- Focuses and selects its text on mount.
- Commits on `blur` and `Enter`.
- Cancels on `Escape`.
- Stops propagation on mouse and key events so the surrounding canvas /
  sidebar drag handlers don't fire.

If you add a new editable label, reuse this component. Don't reinvent it.

### 3.7 IDs

IDs are generated by `nextId(prefix)` in `store.ts`:
`${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`. The prefixes
in use are `l` (layer), `d` (date), `p` (person), `g` (group). When you add
a new item kind, pick a single unused letter and stick with it — the prefix
appears in persisted snapshots forever.

### 3.8 Coordinates and time

- The timeline is laid out in **content-space pixels**: `monthIdx *
  monthWidth + dayFraction`. Convert through `dateToX` / `dateToEndX` /
  `xToDateParts`. Do not multiply by 30 yourself.
- Month lengths are determined by `new Date(year, month + 1, 0).getDate()`.
  Never hard-code 30 or 31.
- The `monthWidth` is recomputed from the scroll viewport whenever the zoom
  changes (`Canvas.tsx`'s `ResizeObserver` effect). Treat it as a value
  derived from `monthsVisible` × viewport width — don't write to it from
  anywhere except that effect and the persistence layer.

### 3.9 z-index

The canvas overlays a lot of absolutely-positioned content. The current
layering, low to high, is:

| z-index | Element |
| ---: | --- |
| 1 | `layer-bar` |
| 2 | `date-line`, `layer-bar.is-selected` |
| 3 | `date-dot-wrap`, `lane` |
| 5 | `today-marker`, `lane-label`, `draft-preview` |
| 7 | `timeline-grid` (sticky header) |
| 8 | `date-line-label-wrap` |
| 20 | `canvas-toolbar` |
| 100 | `cursor-tooltip` |
| 1000 | `canvas-drag-ghost`, `sidebar-drag-ghost` |

When adding overlays, slot them into this scheme rather than picking
arbitrary values. If you find yourself needing a value not on this list,
update the list.

### 3.10 Styling

- One stylesheet today (`src/styles.css`). Section banners
  (`/* ----- Inspector ----- */`) divide it. This file is **over the
  700-line limit** and must be split on the next non-trivial change — see
  §1.1.
- Design tokens are CSS custom properties on `:root` (colors, fonts,
  fixed widths). New tokens go there.
- State classes follow `is-*` (`is-selected`, `is-open`, `is-drop-target`,
  `is-dragging`, `is-hidden`). Toggle them from JSX with a template
  string — no class-name library.
- Inline `style` is reserved for **runtime-computed geometry** (positions,
  widths, color from user data). Anything static belongs in CSS.
- Form controls and `[contenteditable]` re-enable `user-select: text` at
  the top of `styles.css`. Don't remove this — without it, typing into
  inputs silently fails in some WebKit/Tauri webviews.

### 3.11 Comments

The existing code is sparing with comments and so should new code be.
Comments are warranted when they explain a **non-obvious why**: the
HTML5-DnD note in `LayerSidebar.tsx`, the `user-select` workaround in
`styles.css`, the nonce on `scrollToTarget`, the `LABEL_RESERVATION`
heuristic. Do not narrate what the code already says.

### 3.12 Persistence and snapshots

Two persistence surfaces, both versioned:

- `localStorage` via Zustand's `persist`. Bump `version` and write a
  `migrate` case when the persisted shape changes.
- JSON export/import via `exportSnapshot` / `importSnapshot`. The exported
  payload includes a `version` field (`SNAPSHOT_VERSION`). When the shape
  changes, bump `SNAPSHOT_VERSION` and teach `importSnapshot` to read older
  versions defensively (it already tolerates missing `people`, `groups`,
  and pre-day-of-month layers).

Both layers must remain backward-compatible for at least one minor version
so existing users don't lose data on update.

---

## 4. Building, running, deploying

### 4.1 Develop

```bash
npm install
npm run dev          # web only, http://localhost:1420
npm run tauri:dev    # desktop shell via Tauri
```

### 4.2 Build

```bash
npm run build        # web, base "/"
npm run build:web    # web, base "/magic-eight-ball/" (GitHub Pages)
npm run tauri:build  # desktop binaries
```

`build:web` sets `GH_PAGES=true`, which is read by `vite.config.ts` to flip
the `base`. Don't set the base any other way.

### 4.3 Deploy

`.github/workflows/pages.yml` runs `npm ci && GH_PAGES=true npm run build`
on every push to `main` and publishes `dist/` to GitHub Pages. There is no
staging environment — `main` is the deployed branch. Land work via PRs to
keep `main` clean.

### 4.4 Tauri shell

`src-tauri/src/main.rs` is a 6-line entry that calls `lib.rs`'s `run()`.
The Rust side is intentionally a thin shell — the app is React. If you
need a native capability, add a Tauri command to `lib.rs` and a capability
in `src-tauri/capabilities/default.json` rather than expanding the Rust
surface ad hoc.

---

## 5. Pull-request checklist

Before opening a PR:

- [ ] `npm run build` passes (this runs `tsc -b` and `vite build`).
- [ ] No file exceeds 700 lines (see §1.1). `wc -l src/**/*.{ts,tsx,css}
      src-tauri/src/*.rs` is the quickest check.
- [ ] No new `@ts-ignore`, no relaxed `tsconfig` flags.
- [ ] Drag interactions tested in both `npm run dev` and `npm run tauri:dev`
      (HTML5 DnD differences bite here).
- [ ] If you touched persisted shape, the migration was added and tested
      against an existing snapshot.
- [ ] If you added a z-index, it was slotted into the table in §3.9 (and
      the table updated).
- [ ] If you added a CSS section, the section comment matches the existing
      `/* ----- Foo ----- */` style.
