# LoopIn — Chrome Web Store Description

## Short Description (132 chars max)
Give your AI coding agent eyes. Capture UI elements, text, and page context — send it straight to Claude Code via MCP.

## Detailed Description

**Give your AI coding agent eyes.**

LoopIn bridges the gap between what you see in your browser and what your AI coding agent understands. Click any element on any webpage — LoopIn captures its HTML, computed styles, accessibility attributes, and surrounding context, then sends it directly to your AI agent via MCP (Model Context Protocol).

**The problem:** You're looking at a UI. Your AI agent isn't. You end up describing what you see in words, losing precision. LoopIn fixes that.

**How it works:**
1. Click the LoopIn icon or press Cmd+Shift+C to activate capture mode
2. Hover over any element — LoopIn highlights it with a clean overlay
3. Click to capture — the element's full context is sent to your local MCP server
4. Your AI agent receives structured data: HTML, styles, selectors, page context

**What gets captured:**
• HTML structure and content
• Computed CSS styles
• Accessibility attributes  
• CSS selectors for targeting
• Page URL and title for context

**Privacy first:** Everything stays on your machine. LoopIn sends data only to your local MCP server (localhost). No analytics, no tracking, no remote servers.

**Built for developers and designers** who work with AI coding agents and want to close the visual context gap.

**Requirements:**
• A local MCP server running on port 3456 (included with LoopIn's npm package)
• An AI coding agent that supports MCP (Claude Code, etc.)

Open source: github.com/skip5this/loopin
