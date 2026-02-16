# Chrome Web Store Submission Checklist — LoopIn

> Browser extension for AI coding agents that captures UI elements, text selections, accessibility data, and sends them to an MCP server.

---

## 1. Developer Account Setup

- [ ] **Google account** — Use a dedicated email for publishing (can't change later)
- [ ] **Register** at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [ ] **Pay one-time $5 registration fee**
- [ ] **Verify your email** — Required before publishing
- [ ] **Set publisher name** — Appears under your extension title
- [ ] **Physical address** — Only required if you offer paid features/subscriptions (probably not needed for LoopIn)

---

## 2. Required Assets

### Icons
- [ ] **128×128 PNG** extension icon (96×96 actual art + 16px transparent padding)
  - Works on light and dark backgrounds
  - No edges/borders (UI adds its own)
  - Include in your ZIP file
- [ ] **48×48 PNG** icon (for extensions management page)
- [ ] **16×16 PNG** icon (for favicon / toolbar if needed)

### Store Listing Images
- [ ] **At least 1 screenshot** (1280×800 or 640×400) — **Required**
- [ ] **Small promotional image** (440×280) — **Required**
- [ ] Large promotional image (920×680) — Optional but recommended
- [ ] Marquee promotional image (1400×560) — Optional, needed for featuring

### Text Content
- [ ] **Extension name**: "LoopIn" (max 75 chars)
- [ ] **Short description** (max 132 chars) — Shows in search results
- [ ] **Detailed description** (no limit, but be thorough) — Explain what it does, why, how
- [ ] **Category** — Developer Tools
- [ ] **Language** — Primary language of listing
- [ ] **Support URL or email** — Required

### Privacy
- [ ] **Privacy policy URL** — **Required** (see Section 5)
- [ ] **Privacy practices disclosures** — Declare what data you collect in the dashboard
- [ ] **Single purpose description** — Clearly state the extension's single purpose

---

## 3. Manifest V3 Requirements & Gotchas

### Must-haves
- [ ] `"manifest_version": 3`
- [ ] `"name"`, `"version"`, `"description"`
- [ ] `"icons"` with 16, 48, 128 sizes
- [ ] Use **service workers** instead of background pages (`"background": { "service_worker": "..." }`)
- [ ] Use `chrome.scripting.executeScript()` instead of `chrome.tabs.executeScript()`

### Common MV3 Gotchas
- **No remote code execution** — All JS must be bundled in the extension. No `eval()`, no `new Function()`, no loading scripts from external servers
- **Service worker lifecycle** — Service workers terminate after ~30s of inactivity. Use `chrome.alarms` or persistent connections for ongoing work
- **Content Security Policy** — More restrictive in MV3. No inline scripts, no `unsafe-eval`
- **`declarativeNetRequest`** replaces `webRequest` blocking — If you need to intercept requests
- **Host permissions** — Declare in `"host_permissions"` (separate from `"permissions"` in MV3)
- **No persistent background** — Can't use `"persistent": true` anymore

### LoopIn-Specific Manifest Considerations
```json
{
  "manifest_version": 3,
  "name": "LoopIn",
  "permissions": ["activeTab", "scripting"],
  "host_permissions": [],
  "content_scripts": [...],
  "background": {
    "service_worker": "background.js"
  }
}
```

---

## 4. Review Process

### Timeline
- **Most submissions**: reviewed within 24 hours
- **90%+ complete within 3 days**
- **New developers / new extensions**: may take longer (flagged for closer review)
- After approval, you have **30 days to publish** before it reverts to draft

### What Reviewers Look For
- Policy compliance (no malware, no deception, no data harvesting)
- Permissions are justified and actually used
- Single purpose — does what it says, nothing more
- No obfuscated code (minified is OK, obfuscated is NOT)
- Privacy policy matches actual data handling
- No remote code loading

### Common Rejection Reasons
1. **Excessive permissions** — Requesting more than needed (e.g., `<all_urls>` when you only need specific sites)
2. **Missing/inadequate privacy policy** — Must match your actual data practices
3. **Unclear single purpose** — Extension does too many unrelated things
4. **Obfuscated code** — Any obfuscation = rejection
5. **Remote code execution** — Loading and executing external scripts
6. **Misleading metadata** — Name/description doesn't match functionality
7. **Missing permission justification** — Not explaining why you need each permission in the dashboard
8. **Affiliate/ad behavior** not disclosed
9. **User data policy violations** — Collecting more than declared

### Signals That Increase Review Scrutiny
- New developer account
- New extension (no track record)
- Broad host permissions (`*://*/*`, `<all_urls>`)
- Sensitive permissions (tabs, cookies, webRequest)
- Large or complex codebases
- Significant code changes between versions

---

## 5. Privacy Policy Requirements

**You MUST have a privacy policy** because LoopIn handles user data (DOM elements, text selections, accessibility data).

### What Your Privacy Policy Must Cover
- [ ] What data you collect (DOM elements, text selections, accessibility tree data)
- [ ] How data is used (sent to a local MCP server for AI agent consumption)
- [ ] Where data is stored/sent (local machine only — emphasize this heavily)
- [ ] Data retention (transient — not stored persistently)
- [ ] No data sold to third parties
- [ ] No data sent to remote servers (if true — big selling point for review)
- [ ] User control — how to disable/uninstall
- [ ] Contact information

### Key Points for LoopIn's Privacy Policy
Since data goes to a **local MCP server**, emphasize:
- All data stays on the user's machine
- No cloud transmission, no remote servers
- Extension communicates only with `localhost` / `127.0.0.1`
- User must explicitly initiate data capture (not passive collection)

### Where to Host
- GitHub Pages (free, easy)
- A `/privacy` page on your project site
- Even a GitHub repo markdown file works (just needs a public URL)

### Dashboard Privacy Disclosures
In the developer dashboard, you must also declare:
- [ ] Whether the extension collects personal data
- [ ] Data usage purposes
- [ ] Whether data is sold
- [ ] Whether data is used for purposes unrelated to the extension

---

## 6. Permissions That Flag Review

### Permissions LoopIn Likely Needs

| Permission | Risk Level | Notes |
|---|---|---|
| `activeTab` | ✅ Low | Preferred — grants temporary access only when user clicks. **Use this.** |
| `scripting` | ⚠️ Medium | Needed for `chrome.scripting.executeScript()`. Justify in dashboard. |
| `contextMenus` | ✅ Low | If you add right-click menu options |
| `storage` | ✅ Low | For extension settings |

### Permissions to AVOID (unless absolutely necessary)
| Permission | Risk Level | Why |
|---|---|---|
| `<all_urls>` | 🔴 High | Broad host permission — triggers deep review. Use `activeTab` instead. |
| `tabs` | ⚠️ Medium | Gives access to all tab URLs. Avoid if `activeTab` suffices. |
| `webRequest` | ⚠️ Medium | Network interception — scrutinized heavily |
| `cookies` | 🔴 High | Access to cookies — strong justification needed |
| `history` | 🔴 High | Browsing history access |
| `debugger` | 🔴 High | Full DevTools protocol access — very hard to get approved |

### Best Practice
- **Request minimum permissions** — Only what you actually use
- **Prefer `activeTab`** over broad host permissions — it's user-initiated and time-limited
- **Justify every permission** in the developer dashboard
- If you need to inject content scripts, declare specific URL patterns rather than `<all_urls>`

---

## 7. Step-by-Step Submission Checklist

### Pre-Submission
- [ ] Extension works correctly on Manifest V3
- [ ] All code bundled locally (no remote code loading)
- [ ] No obfuscated code
- [ ] Permissions are minimal and justified
- [ ] `manifest.json` has correct name, version, description, icons
- [ ] Test on multiple sites / scenarios

### Assets Ready
- [ ] 128×128 PNG icon (in extension ZIP)
- [ ] 48×48 and 16×16 icons
- [ ] At least 1 screenshot (1280×800 or 640×400)
- [ ] Small promo image (440×280)
- [ ] Compelling description written
- [ ] Privacy policy hosted at a public URL

### Account Setup
- [ ] Developer account registered ($5 paid)
- [ ] Email verified
- [ ] Publisher name set

### Dashboard Submission
1. [ ] Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. [ ] Click **"New Item"**
3. [ ] Upload ZIP file of your extension
4. [ ] Fill in **Store Listing** tab:
   - Name, description, category, language
   - Upload screenshots and promo images
   - Add support email/URL
5. [ ] Fill in **Privacy** tab:
   - Privacy policy URL
   - Data usage disclosures
   - Permission justifications
   - Single purpose description
6. [ ] Fill in **Distribution** tab:
   - Visibility (Public / Unlisted)
   - Geographic distribution
   - Trusted testers (if doing staged rollout first)
7. [ ] **Preview** your listing
8. [ ] Click **"Submit for Review"**
9. [ ] Wait for review (typically 1-3 days)
10. [ ] If rejected — read rejection email, fix issues, resubmit
11. [ ] Once approved — publish within 30 days

### Post-Publication
- [ ] Verify listing appears correctly
- [ ] Test installation from store
- [ ] Monitor reviews and support requests
- [ ] Set up update pipeline (bump version, re-upload ZIP)

---

## Quick Reference Links

- [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Register Account](https://developer.chrome.com/docs/webstore/register)
- [Supplying Images](https://developer.chrome.com/docs/webstore/images)
- [Review Process](https://developer.chrome.com/docs/webstore/review-process)
- [Program Policies](https://developer.chrome.com/docs/webstore/program-policies)
- [Publish Guide](https://developer.chrome.com/docs/webstore/publish/)
- [MV3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate)
