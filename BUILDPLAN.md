# LoopIn Extension Rebuild Plan

**Goal:** Rebuild the extension UI into a polished, persistent control bar with MetaLab-inspired styling. Add key features learned from Agentation while keeping our own identity.

**Style:** MetaLab — dark, premium, elegant. Deep blacks (#0a0a0f), subtle purple tints, refined rounded corners, subtle shadows and borders. Our accent: #635bff (LoopIn purple).

---

## Phase 1: Control Bar Foundation

### Step 1 — Persistent bottom-right control bar
Replace the current floating indicator with a fixed pill in the bottom-right corner. Always visible when extension is active. Small, minimal, non-intrusive.
- Row of icon buttons: Capture toggle, Freeze animations, Settings, Minimize
- Badge showing pending task count
- MetaLab styling: dark glass, subtle border, rounded-full pill shape
- Draggable? Maybe later. Fixed bottom-right for now.

### Step 2 — Capture toggle in control bar
Move the on/off capture mode toggle into the control bar. Green dot = active, gray = off. Click to toggle (replaces the old floating indicator entirely).
- Keyboard shortcut still works (Cmd+Shift+C)
- Remove the old `#loopin-indicator` element completely

### Step 3 — Restyle the capture dialog
When you click an element, the dialog that appears (instruction input + send/cancel) gets the MetaLab treatment.
- Dark background (#0a0a0f)
- Subtle border (rgba(255,255,255,0.06))
- Refined typography
- Cleaner button styles matching the accent purple
- Element preview section: show tag, selector, and a snippet of the HTML

## Phase 2: Enhanced Capture Data

### Step 4 — Bounding box visualization
When hovering in capture mode, show a cleaner highlight overlay with dimensions displayed (width × height in px). Currently we have a dashed border — upgrade to a semi-transparent overlay with a label.

### Step 5 — Text selection capture
Allow selecting text on the page as an annotation (not just clicking elements). Selected text gets quoted in the output — makes it easy for AI to search for exact strings. Add a "Select text" mode button to the control bar.

### Step 6 — Richer element data
Enhance what we capture per element:
- Current: tagName, id, className, selector, outerHTML, innerText, computedStyles, boundingRect, url
- Add: accessibility attributes (role, aria-label, alt text), data attributes, closest heading context, visible text truncated to 200 chars
- This gives the AI more context without overwhelming it

### Step 7 — React component detection
When on a React page, traverse the fiber tree to find the component hierarchy for the selected element. Show component names like `<App> → <Dashboard> → <Button>` in the capture output. Helps AI agents find the exact file to edit.
- Detect React via `__REACT_DEVTOOLS_GLOBAL_HOOK__`
- Walk fiber tree from the DOM element up
- Include component names in capture data
- Show in capture dialog as "Component: Dashboard > Button"

## Phase 3: Control Bar Features

### Step 8 — Freeze animations button
Add a snowflake/pause icon to the control bar. Click to freeze all CSS animations, JS-driven motion, and videos on the page. Click again to resume. Useful for capturing specific states.

### Step 9 — Settings panel
Expandable settings when you click the gear icon in the control bar:
- Server URL (currently in popup — move here)
- Connection status indicator (green dot if server reachable)
- Output verbosity (Compact / Standard / Detailed) — controls how much data gets sent with each capture

### Step 10 — Task list panel
Expandable section showing recent captures/tasks:
- List of pending tasks with element name + instruction preview
- Status indicators (pending / done)
- Click to re-highlight the element on page (if still present)
- Clear all button
- This replaces needing to check the server manually

## Phase 4: Polish & Ship

### Step 11 — Collapse/expand behavior
- Click the LoopIn icon to collapse the bar to just the icon
- Click again to expand
- Remember state in localStorage
- Escape key collapses
- Smooth animation (150ms ease)

### Step 12 — Remove old popup.html
The Chrome extension popup (popup.html) gets replaced by the in-page control bar. The popup can become a simple "LoopIn is active on this page" with a link to settings. Or remove it entirely — the control bar IS the UI now.

### Step 13 — Final style pass
- Ensure all UI elements match MetaLab aesthetic
- Consistent spacing, typography, colors
- Subtle hover/active states
- No jarring elements — everything should feel integrated
- Test on light and dark pages to make sure the bar is always readable

---

## Data Captured (Final)

| Field | Current | After |
|-------|---------|-------|
| tagName | ✅ | ✅ |
| id, className | ✅ | ✅ |
| selector | ✅ | ✅ (improved) |
| outerHTML | ✅ | ✅ (truncated smarter) |
| innerText | ✅ | ✅ (truncated 200 chars) |
| computedStyles | ✅ | ✅ |
| boundingRect | ✅ | ✅ + displayed on hover |
| url | ✅ | ✅ |
| accessibility | ❌ | ✅ role, aria-label, alt |
| data attributes | ❌ | ✅ |
| React components | ❌ | ✅ fiber tree walk |
| selected text | ❌ | ✅ quoted selection |
| heading context | ❌ | ✅ nearest h1-h6 |
| instruction | ✅ | ✅ |
| verbosity level | ❌ | ✅ compact/standard/detailed |

---

## What Makes Us Different from Agentation

- **LoopIn is server-connected by default** — captures go to an MCP server, not just clipboard
- **OpenClaw integration** — webhook notifies the AI agent automatically, no paste required
- **Works as a Chrome extension** — no npm install needed, works on ANY page including production sites
- **Bookmarklet fallback** — zero install option for quick use
- **A11y Copilot built in** — accessibility auditing alongside capture

---

## Build Order

Start: Steps 1-3 (control bar + restyled dialog) — this is the biggest visual/UX improvement
Then: Steps 4-7 (enhanced data) — makes captures more useful
Then: Steps 8-10 (control bar features) — adds power features  
Finally: Steps 11-13 (polish) — ship-ready

Estimated: 3-4 focused sessions
