# Browser Bridge

Capture elements from your browser and send them to Claude Code via MCP.

## Quick Start

### 1. Install dependencies

```bash
cd /Users/scottbell/code/browser-bridge
npm install
```

### 2. Build the TypeScript

```bash
npm run build
```

### 3. Add to Claude Code config

Add this to your `~/.claude.json`:

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

### 4. Restart Claude Code

Exit and reopen Claude Code for the MCP server to connect.

### 5. Use the bookmarklet

**Option A: Loader (recommended)**

Create a new bookmark with this URL:

```
javascript:(function(){var s=document.createElement('script');s.src='http://localhost:3456/inject.js';document.body.appendChild(s);})();
```

**Option B: Self-contained**

Run `npm run bookmarklet` and copy the contents of `bookmarklet/bookmarklet.txt` to a bookmark.

### 6. Capture elements

1. Open any webpage
2. Click the bookmarklet
3. Click elements to capture them
4. In Claude Code, ask about captured elements:
   - "what did I just capture?"
   - "any pending tasks?"
   - "list all captures"

## Keyboard Shortcuts

- `Ctrl+Shift+C` - Toggle capture mode
- `Escape` - Turn off capture mode

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_captured_element` | Get the most recent capture |
| `list_captures` | List all captures |
| `get_capture` | Get a specific capture by index |
| `clear_captures` | Clear all captures |
| `get_pending_tasks` | Get tasks with instructions |
| `mark_task_done` | Mark a task complete |
| `get_console_errors` | Get captured console errors |
