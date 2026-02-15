# LoopIn Chrome Extension

A Chrome extension that captures DOM elements, text selections, and rich context — then sends it all to your AI coding agent via MCP.

## Features

- **Element Capture** — Click any element to capture HTML, CSS, selectors, and computed styles
- **Text Selection** — Highlight text passages and send them with annotations
- **Data Enrichment** — Automatically captures accessibility attributes, React component hierarchy, heading context, and data attributes
- **Freeze Animations** — Pause CSS animations, transitions, and videos to capture exact states
- **Task List** — Track all captures in a live session panel
- **Settings** — Configure server URL with live connection status
- **MetaLab-inspired UI** — Dark, premium control bar that stays out of your way

## Installation

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" → select this `extension/` folder

## Usage

### Element Capture
1. Click **Capture** in the control bar (or press `⌘⇧C`)
2. Hover over elements — they highlight with a purple outline
3. Click to capture → add an optional instruction → Send

### Text Selection
1. Click the **T** button in the control bar
2. Highlight any text on the page
3. Release to capture → add an instruction → Send

### Freeze Animations
Click the **⏸** button to pause all CSS animations, transitions, and videos. Click again to resume.

### Task List
Click the **list** button to see all recent captures in the current session. Clear all or review what you've sent.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘⇧C` / `Ctrl+Shift+C` | Toggle element capture mode |
| `Escape` | Exit capture mode / close panels |
| `⌘Enter` | Send from capture dialog |

## What Gets Captured

| Data | Description |
|------|-------------|
| HTML | Tag, classes, truncated outerHTML |
| CSS | Computed colors, spacing, layout, typography |
| Selector | Unique CSS path to the element |
| Accessibility | ARIA roles, labels, alt text, tab index |
| React Components | Component hierarchy via fiber tree walk |
| Context | Nearest heading, data attributes |
| Bounding Rect | Position and dimensions |
| Page | URL and document title |

## Configuration

Default server: `http://localhost:3456`

Change via the **⚙** settings panel in the control bar. Green dot = connected, red = disconnected.

## Architecture

- `content.js` — Injected into pages. Control bar, capture logic, enrichment, dialogs.
- `content.css` — MetaLab-inspired dark theme styles.
- `background.js` — Service worker. Proxies fetch requests to bypass mixed content (HTTPS→HTTP).
- `popup.html/js` — Extension popup (minimal — control bar is the main UI).
- `a11y.js` — Accessibility audit mode (axe-core integration).

## MCP Server

The extension sends captures to a local MCP server. See the root `server/` directory for the MCP server that exposes captures as tools to Claude Code, Cursor, or any MCP-compatible agent.
