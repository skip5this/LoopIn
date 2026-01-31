# LoopIn Chrome Extension

A Chrome extension that captures DOM elements and sends them to Claude Code via MCP.

## Development Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `extension` folder

## Usage

1. Click the LoopIn extension icon in your toolbar
2. Click "Enable Capture Mode"
3. Click any element on the page
4. Add an optional instruction
5. Ask Claude Code about your capture!

### Keyboard Shortcuts

- **Ctrl+Shift+C** (Cmd+Shift+C on Mac): Toggle capture mode
- **Escape**: Exit capture mode

## Configuration

The extension connects to the LoopIn server at `http://localhost:3456` by default.

You can change the server URL in the extension popup's settings section.

## Files

- `manifest.json` - Extension configuration
- `content.js` - Injected into pages, handles element capture
- `content.css` - Styles for capture UI (highlight, dialog, toasts)
- `popup.html` / `popup.js` - Extension popup UI
- `background.js` - Service worker for badge updates and shortcuts

## Building for Production

TODO: Add build script for:
- Minification
- Icon generation
- Chrome Web Store packaging

## Icons

Icons are currently using Chrome's default puzzle piece. To add custom icons:

1. Create PNG files at 16x16, 48x48, and 128x128 pixels
2. Save as `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
3. Uncomment the icon references in `manifest.json`
