# Magic Eight Ball

A multi-year, Gantt-style planning canvas. Built as a [Tauri 2](https://tauri.app/) desktop app and a web app deployed to GitHub Pages.

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
- Double-click a span's label or a date's label to rename it in place.
- Dates can repeat **weekly / monthly / annual / custom (every N days)** — ghost copies are drawn at each occurrence.
- Add a **Person** from the + menu. A person has a birthday (rendered as an annual dot) and can act as a container for any number of spans and dates (assigned via the inspector).
- A thin red line marks today; a small tooltip near the cursor shows the date you're hovering.

## Develop

```bash
npm install
npm run dev          # web only
npm run tauri:dev    # desktop app via Tauri
```

## Build

```bash
npm run build              # web (default base path "/")
npm run build:web          # web with base "/magic-eight-ball/" (GitHub Pages)
npm run tauri:build        # desktop binaries via Tauri
```

## Web deployment

`.github/workflows/pages.yml` builds the web app on every push to `main` and deploys `dist/` to GitHub Pages. Enable Pages in repo settings → Pages → Source: GitHub Actions.
