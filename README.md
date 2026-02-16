# LoopIn

Give your AI coding agent eyes on the browser. Capture UI elements, text, styles, and accessibility data — then send it all directly to your agent via MCP.

## How It Works

```
Browser Extension → HTTP → LoopIn Server → MCP (stdio) → AI Agent
```

LoopIn runs a local server that bridges your browser and your AI agent. The Chrome extension captures elements you click on, enriches them with context (HTML, CSS, selectors, accessibility attributes, React components), and sends it to the server. Your agent reads captures through MCP tools — no copy-paste, no screenshots.

## Two Ways to Use LoopIn

### Option A: Local Agent (Claude Code on your machine)

The simplest setup. Everything runs on one machine.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Chrome     │────▶│ LoopIn Server│────▶│ Claude Code │
│  Extension   │     │  (port 3456) │     │   (local)   │
└─────────────┘     └──────────────┘     └─────────────┘
         Your laptop
```

**1. Install & build**

```bash
git clone https://github.com/skip5this/LoopIn.git
cd LoopIn
npm install
npm run build
```

**2. Add LoopIn as an MCP server**

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "loopin": {
      "command": "node",
      "args": ["/path/to/LoopIn/dist/server.js"]
    }
  }
}
```

**3. Restart Claude Code** so it picks up the new MCP server.

**4. Load the Chrome extension**

- Open `chrome://extensions`
- Enable "Developer mode"
- Click "Load unpacked" → select the `extension/` folder
- Pin LoopIn to your toolbar

**5. Capture**

- Click the LoopIn icon to activate
- Click any element on a page
- Add context ("Make this button green", "Fix the alignment here")
- Hit Capture
- In Claude Code: *"What did I just capture?"* or *"Any pending tasks?"*

That's it. Your agent can now see what you see.

---

### Option B: Remote Agent (OpenClaw / another machine)

This is for when your AI agent runs on a different machine than your browser — like an always-on server, a home lab setup, or an [OpenClaw](https://github.com/openclaw/openclaw) agent.

```
┌─────────────┐     ┌──────────────┐            ┌──────────────┐
│   Chrome     │────▶│ LoopIn Server│───── network ────▶│  AI Agent    │
│  Extension   │     │  (port 3456) │            │ (other machine)│
└─────────────┘     └──────────────┘            └──────────────┘
    Your laptop         Your laptop              Server / iMac / etc.
```

The key difference: your agent can't use stdio MCP directly because it's on a different machine. Instead, the agent hits LoopIn's HTTP API over the network.

**1. Set up LoopIn on your laptop**

Same as Option A — install, build, load the extension. But you'll also need to make the server accessible on your network:

```bash
# Start the server (it listens on all interfaces by default on port 3456)
npm run build && node dist/server.js
```

**2. Configure your agent to reach LoopIn**

Your remote agent needs to know your laptop's IP and LoopIn's port. The agent calls the HTTP API directly:

```bash
# Check for new captures
curl http://YOUR_LAPTOP_IP:3456/captures

# Get the latest capture
curl http://YOUR_LAPTOP_IP:3456/captures/latest

# Get pending tasks (captures with instructions)
curl http://YOUR_LAPTOP_IP:3456/tasks/pending

# Mark a task done
curl -X POST http://YOUR_LAPTOP_IP:3456/tasks/0/done
```

**3. Webhook notifications (optional)**

Want your agent to be notified instantly when you capture something? Set the `OPENCLAW_WEBHOOK_URL` environment variable:

```bash
OPENCLAW_WEBHOOK_URL=http://AGENT_IP:PORT/webhook node dist/server.js
```

LoopIn will POST to that URL every time a capture comes in — so your agent doesn't have to poll.

**4. Extension settings**

If the LoopIn server is running on a different machine than Chrome (less common), open the extension settings (gear icon) and change the server URL from `http://localhost:3456` to `http://SERVER_IP:3456`.

**Real-world example:** This is exactly how we use LoopIn. Scott browses on his MacBook, captures UI elements, and Rene (an OpenClaw agent running on an iMac across the room) picks them up over the local network and acts on them.

---

## Chrome Extension Controls

| Button | Action |
|--------|--------|
| **● Capture** | Toggle capture mode — hover to highlight, click to capture |
| **📋 Tasks** | View all captures in a session panel |
| **⚙ Settings** | Server URL, connection status |

## MCP Tools (Local Agent)

| Tool | Description |
|------|-------------|
| `get_captured_element` | Get the most recent capture |
| `list_captures` | List all captures with timestamps |
| `get_capture` | Get a specific capture by index |
| `clear_captures` | Clear all captures |
| `get_pending_tasks` | Get captures that have instructions attached |
| `mark_task_done` | Mark a task as complete |
| `get_console_errors` | Get captured console errors from the page |

## HTTP API (Remote Agent)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server status check |
| `/stats` | GET | Capture count and server info |
| `/captures` | GET | List all captures |
| `/captures/latest` | GET | Most recent capture |
| `/capture/element` | POST | Submit a capture (used by extension) |
| `/tasks/pending` | GET | Captures with instructions |
| `/tasks/:index/done` | POST | Mark task complete |

## What Gets Captured

Every element capture includes:

- **HTML** — Tag, classes, inner content
- **CSS** — Computed colors, spacing, layout, typography
- **Selector** — Unique path to the element
- **Dimensions** — Width, height, position
- **Context** — Heading hierarchy, data attributes
- **React Components** — Fiber tree (when available)
- **Your Instructions** — Whatever context you add ("Make this green", "Fix the spacing")

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSER_BRIDGE_PORT` | `3456` | Port for the HTTP server |
| `OPENCLAW_WEBHOOK_URL` | — | URL to POST capture notifications to |

## Privacy

All data stays local. LoopIn runs entirely on your machine — no cloud services, no telemetry, no data collection. Captures exist only in memory and are cleared when the server restarts. See [PRIVACY.md](PRIVACY.md) for details.
