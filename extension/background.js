// LoopIn Background Service Worker

// Track capture stats
let captureStats = {
  captures: 0,
  tasks: 0,
  lastCapture: null
};

const DEFAULT_SERVER = 'http://localhost:3456';

// Get the current server URL from storage
async function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['serverUrl'], (result) => {
      resolve(result.serverUrl || DEFAULT_SERVER);
    });
  });
}

// Proxy fetch from content scripts (bypasses mixed content restrictions)
async function proxyFetch(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: response.ok, status: response.status, data };
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'captured') {
    captureStats.captures++;
    captureStats.lastCapture = Date.now();
    updateBadge(sender.tab?.id);
  } else if (message.type === 'task_sent') {
    captureStats.tasks++;
    captureStats.lastCapture = Date.now();
    updateBadge(sender.tab?.id);
  } else if (message.type === 'state_changed') {
    // Update badge when capture mode changes
    if (sender.tab?.id) {
      setBadgeForTab(sender.tab.id, message.captureMode);
    }
  } else if (message.type === 'proxy_fetch') {
    // Proxy fetch requests from content scripts to bypass mixed content
    proxyFetch(message.url, message.options)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }
});

// Update badge to show activity
function updateBadge(tabId) {
  if (tabId) {
    chrome.action.setBadgeText({ text: '✓', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
    
    setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId });
    }, 1500);
  }
}

// Set badge based on capture mode
function setBadgeForTab(tabId, isActive) {
  if (isActive) {
    chrome.action.setBadgeText({ text: '●', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#635bff', tabId });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// Handle keyboard shortcut
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'toggle-capture') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await ensureContentScriptAndToggle(tab.id);
    }
  }
});

// Inject content script if not already present, then toggle
async function ensureContentScriptAndToggle(tabId) {
  try {
    // Try sending toggle — if content script is loaded, this works
    await chrome.tabs.sendMessage(tabId, { type: 'toggle' });
  } catch (e) {
    // Content script not injected yet — inject it now
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
      // Small delay to let it initialize, then toggle on
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tabId, { type: 'toggle' });
        } catch (err) {
          console.log('Could not toggle after injection:', err);
        }
      }, 100);
    } catch (injectErr) {
      console.log('Could not inject content script:', injectErr);
    }
  }
}

// Clicking the extension icon toggles capture mode (no popup)
chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    await ensureContentScriptAndToggle(tab.id);
  }
});

// Reset badge when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

console.log('[LoopIn] Background service worker loaded');
