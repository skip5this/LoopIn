# LoopIn — Privacy Policy

*Last updated: February 18, 2026*

## What LoopIn Does

LoopIn is a browser extension that lets you capture UI elements from web pages and send them to a local AI coding agent via MCP (Model Context Protocol).

## Data Collection

**LoopIn does not collect, store, or transmit any personal data.**

### What LoopIn captures (only when you activate it):
- HTML structure of selected elements
- Computed CSS styles of selected elements  
- Page URL and title (for context)
- Accessibility attributes of selected elements

### Where that data goes:
- **Only to your local machine.** Captured data is sent to a local MCP server running on `localhost:3456`. It never leaves your computer unless your local AI agent sends it somewhere as part of its own operation.

### What LoopIn does NOT do:
- Does not collect analytics or usage data
- Does not use cookies or tracking
- Does not transmit data to any remote server
- Does not store captured data persistently
- Does not access data on pages you haven't actively captured from
- Does not run in the background when not activated

## Permissions

- **activeTab**: To access the current tab's content when you activate capture mode
- **scripting**: To inject the capture overlay UI into the current page
- **storage**: To save your preferences (like keyboard shortcut settings)

## Third Parties

LoopIn has no third-party dependencies that collect data. There are no analytics, ads, or tracking services.

## Changes

If this policy changes, we'll update this document and the "last updated" date above.

## Contact

Questions? Open an issue at [github.com/skip5this/loopin](https://github.com/skip5this/loopin) or email scott.k.bell@gmail.com.
