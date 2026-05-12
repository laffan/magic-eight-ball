# Magic Eight Ball

A multi-year, Gantt-style planning canvas. Built as a [Tauri 2](https://tauri.app/) desktop app and a web app deployed to GitHub Pages.

## Layout

- A horizontally scrollable timeline of years and months (30 px per month, 360 px per year).
- A vertically scrollable stack of layer rows.
- A left sidebar listing all layers and dates.
- A right inspector for the selected item, with a full-height toggle on its left edge.
- A `+` button in the lower-left of the canvas with a flyout menu.

## Interactions

- Click on the canvas to drop a **date** (full-height vertical bar).
- Click and drag horizontally to draw a **layer** (a Gantt-style span).
- Drag either end of a layer to resize. Drag the body to move.
- Click an item to select it; edit its label in the inspector.

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
