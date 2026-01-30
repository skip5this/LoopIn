# Browser Bridge

A tool that connects your browser to Claude Code via MCP. Capture elements, add instructions, and let Claude edit your code.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Browser        │ ──── │  MCP Server     │ ──── │  Claude Code    │
│  (bookmarklet)  │ HTTP │  (Node.js)      │ stdio│  (CLI)          │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Tech Stack

- **MCP Server**: Node.js + TypeScript
- **HTTP Server**: Express (receives from browser)
- **MCP SDK**: @modelcontextprotocol/sdk
- **Browser**: Vanilla JS bookmarklet (no dependencies)
- **Target Framework**: React (will add devtools hooks in Stage 4)

---

## Stage 1: Basic Capture

**Goal**: Click elements in browser, query them from Claude Code.

### Files to Create

```
browser-bridge/
├── package.json
├── tsconfig.json
├── src/
│   └── server.ts        # MCP + HTTP server
├── bookmarklet/
│   └── inject.js        # Browser script
└── PLAN.md
```

### MCP Server (src/server.ts)

- Express server on port 3456
- Endpoints:
  - `POST /capture/element` - Receive captured element data
- MCP tools:
  - `get_captured_element` - Return most recent element
  - `list_captures` - Return all captured elements
  - `clear_captures` - Clear capture buffer

### Bookmarklet (bookmarklet/inject.js)

- Toggle capture mode on/off
- Highlight elements on hover (dashed border)
- On click: capture element data and POST to localhost:3456
- Show toast notification on capture
- Data captured:
  - tagName, id, className
  - outerHTML (truncated)
  - Unique CSS selector
  - Computed styles (filtered to relevant props)
  - Bounding rect

### Setup Instructions

1. `npm install`
2. `npm run build`
3. Add to Claude Code config (~/.claude.json)
4. Copy bookmarklet to browser bookmarks bar

---

## Stage 2: Instructions Dialog

**Goal**: Add context/instructions when capturing elements.

### Changes to Bookmarklet

- On click: show dialog instead of immediate capture
- Dialog shows:
  - Preview of selected element
  - Text input for instruction
  - Cancel / Send buttons
- Send element + instruction together

### Changes to MCP Server

- New storage structure: tasks (element + instruction pairs)
- New endpoint: `POST /capture/task`
- New tools:
  - `get_pending_tasks` - Return tasks with instructions
  - `mark_task_done` - Mark task completed
  - `get_task` - Get specific task by index

---

## Stage 3: Polish UI

**Goal**: Better UX with floating widget.

### Floating Widget Features

- Draggable panel (remember position)
- Toggle button: Off / Capture Mode / Watch Errors
- Recent captures list
- Minimize to small icon with badge
- Keyboard shortcut to toggle (Ctrl+Shift+C)

### Additional Captures

- Console errors (monkey-patch console.error)
- Console warnings
- Unhandled promise rejections
- Network failures (fetch wrapper)

### New MCP Tools

- `get_console_errors` - Return captured errors
- `get_network_failures` - Return failed requests

---

## Stage 4: Nice-to-Haves

**Goal**: Power features for advanced use cases.

### Source File Detection (React)

- Hook into React DevTools if available
- Get component name and potentially file path
- Add `__source` info in dev builds

### Style Extraction for Inspiration

- Enhanced style capture from any site
- Extract as design tokens (colors, radii, shadows, fonts)
- Tool: `get_captured_styles` - Return extracted tokens

### Multiple Element Selection

- Shift+click to add to selection
- Capture multiple elements with one instruction

### Screenshot Thumbnail

- Use html2canvas or similar to capture element image
- Store as base64, show in Claude Code (if supported)

---

## MCP Tools Summary

| Tool | Stage | Description |
|------|-------|-------------|
| `get_captured_element` | 1 | Most recent element |
| `list_captures` | 1 | All captured elements |
| `clear_captures` | 1 | Clear buffer |
| `get_pending_tasks` | 2 | Tasks with instructions |
| `mark_task_done` | 2 | Complete a task |
| `get_console_errors` | 3 | Browser console errors |
| `get_network_failures` | 3 | Failed HTTP requests |
| `get_captured_styles` | 4 | Design tokens from element |

---

## Configuration

### Claude Code Config (~/.claude.json)

```json
{
  "mcpServers": {
    "browser-bridge": {
      "command": "node",
      "args": ["/Users/scottbell/code/browser-bridge/dist/server.js"]
    }
  }
}
```

### Environment Variables (optional)

- `BROWSER_BRIDGE_PORT` - HTTP port (default: 3456)

---

## Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run server (for testing)
npm run start

# Development mode (watch)
npm run dev

# Generate bookmarklet (minified)
npm run bookmarklet
```

---

## Current Status

- [x] Planning complete
- [ ] Stage 1: Basic Capture
- [ ] Stage 2: Instructions Dialog
- [ ] Stage 3: Polish UI
- [ ] Stage 4: Nice-to-Haves
