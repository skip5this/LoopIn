# Privacy Policy — LoopIn

**Last updated:** February 16, 2026

## What LoopIn Does

LoopIn is a Chrome extension that lets you capture UI elements and text from web pages to send to your local development server. It bridges what you see in the browser with your AI coding tools.

## Data Collection

**LoopIn does not collect, store, or transmit any personal data.**

### What data is captured

When you actively click an element or select text in capture mode, LoopIn reads:
- The HTML, CSS, and accessibility attributes of that specific element
- The page URL and title
- Any React component hierarchy (if present)

### Where data goes

All captured data is sent **only to your local server** (default: `localhost:3456`). The server URL is configurable and always visible in LoopIn's settings panel.

**No data is ever sent to any external server, cloud service, or third party.**

### Storage

LoopIn stores only:
- Your server URL preference (via `chrome.storage.sync`)
- Control bar collapsed/expanded state (via `chrome.storage.sync`)

No browsing history, cookies, passwords, form data, or personal information is stored or accessed.

## Permissions

- **activeTab:** Required to inject the capture overlay into the current page
- **scripting:** Required to run the content script for element inspection
- **storage:** Required to save your server URL preference

## Third Parties

LoopIn has no analytics, no tracking, no telemetry, and no third-party integrations. It communicates only with the local server you configure.

## Open Source

LoopIn's source code is publicly available at [github.com/skip5this/browser-bridge](https://github.com/skip5this/browser-bridge).

## Contact

Questions? Reach out at [skb.rene@gmail.com](mailto:skb.rene@gmail.com).
