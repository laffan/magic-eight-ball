# Magic Eight Ball

A multi-year, Gantt-style planning canvas. You click to drop dates, drag to
draw spans, and group them by layer or person. It can import `.ics` calendars
and import or export the whole canvas as JSON.

It runs as a desktop app (Tauri) and as a web app deployed to GitHub Pages.

## Installation

Download the installer for your system from the
[Releases](../../releases) page: `.dmg` (macOS), `.msi` or `.exe` (Windows),
`.AppImage`, `.deb` or `.rpm` (Linux).

The builds are not code-signed. On macOS, if the app is blocked on first
launch, move it to Applications and run:

```sh
xattr -cr "/Applications/Magic Eight Ball.app"
```

On Windows, choose "More info" then "Run anyway" when SmartScreen warns.

The web version needs no installation; it is deployed from `.github/workflows/pages.yml`.

### Build from source

Requires [Node.js](https://nodejs.org/), [Rust](https://rustup.rs/) and the
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

```sh
npm install
npm run tauri build    # installers end up in src-tauri/target/release/bundle/
npm run tauri dev      # run in development
```

## More detail

[README_DETAIL.md](README_DETAIL.md) lists the interactions and build commands. [README-TECHNICAL.md](README-TECHNICAL.md) covers the internals.
