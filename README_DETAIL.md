# Magic Eight Ball: details

## Layout

- A horizontally scrollable timeline of years and months (30 px per month, 360 px per year).
- A vertically scrollable stack of layer rows.
- A left sidebar listing all layers and dates.
- A right inspector for the selected item, with a full-height toggle on its left edge.
- A `+` button in the lower-left of the canvas with a flyout menu.

## Interactions

- Click on the canvas to drop a **date** (a labeled dot under the header).
- Mark a date as **Important** in the inspector to render it as a full-height vertical bar instead.
- Click and drag horizontally to draw a **span** (a Gantt-style bar).
- Drag either end of a span to resize. Drag the body to move.
- **Option-drag** (Alt-drag) a span to duplicate it.
- Double-click a span's or date's label to rename it in place.
- Dates can repeat weekly, monthly, annually or every N days; ghost copies are drawn at each occurrence.
- Add a **Person** from the + menu. A person has a birthday (an annual dot) and can contain any number of spans and dates, assigned in the inspector.
- A red line marks today; a tooltip near the cursor shows the date you're hovering.
- The **File menu** imports `.ics` calendars (with a per-event preview) and imports or exports the whole canvas as JSON.

## Develop

```bash
npm install
npm run dev          # web only
npm run tauri:dev    # desktop app via Tauri
```

## Build

```bash
npm run build              # web (base path "/")
npm run build:web          # web with base "/magic-eight-ball/" (GitHub Pages)
npm run tauri:build        # desktop binaries via Tauri
```

## Web deployment

`.github/workflows/pages.yml` builds the web app on every push to `main` and deploys `dist/` to GitHub Pages. Enable Pages in repo settings → Pages → Source: GitHub Actions.

## Value layers and repeating spans

Add **New value** from the + menu, then set its name, start date and starting USD
balance in the inspector. Its timeline row plots the balance; select it from the
Values sidebar or graph to edit it.

Dates and spans have an **Affects Value** checkbox. Choose a value and enter a
signed USD amount. Dates apply the whole amount on their date. Spans distribute
the amount equally over their inclusive calendar days: January 1–7 with +7 adds
1 per day. Contributions before the value's start date are ignored. Repeated
dates and spans contribute on each occurrence. Hiding a group does not remove
its financial contributions. Deleting a value clears its links.

Spans repeat weekly, monthly, yearly, or every custom number of days. Options
that could overlap are excluded (monthly requires at most 28 days, yearly at
most 365); custom intervals cannot be shorter than the span. Repeated copies
select the original for editing. Month-end and leap-day repeats clamp to the
last valid day and retain their original calendar anchor.

Calculation regression tests (Node 22.18+):
`node --experimental-strip-types --test tests/valueMath.test.mjs`.
