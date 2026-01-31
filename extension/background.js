// LoopIn Background Service Worker

// Track capture stats
let captureStats = {
  captures: 0,
  tasks: 0,
  lastCapture: null
};

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
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
      } catch (e) {
        console.log('Could not toggle capture mode:', e);
      }
    }
  }
});

// Reset badge when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});

console.log('[LoopIn] Background service worker loaded');
