// LoopIn Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  const toggleBtn = document.getElementById('toggle-btn');
  const captureStatus = document.getElementById('capture-status');
  const captureDot = document.getElementById('capture-dot');
  const serverStatus = document.getElementById('server-status');
  const serverDot = document.getElementById('server-dot');
  const serverUrlInput = document.getElementById('server-url');
  const saveServerBtn = document.getElementById('save-server');
  const statsSection = document.getElementById('stats-section');
  const capturesCount = document.getElementById('captures-count');
  const tasksCount = document.getElementById('tasks-count');

  let serverUrl = 'http://localhost:3456';

  // Load saved server URL
  const stored = await chrome.storage.sync.get(['serverUrl']);
  if (stored.serverUrl) {
    serverUrl = stored.serverUrl;
    serverUrlInput.value = serverUrl;
  }

  // Get current tab and capture state
  async function getState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'get_state' });
        return response?.captureMode || false;
      }
    } catch (e) {
      console.log('Could not get state:', e);
    }
    return false;
  }

  // Update UI based on capture state
  function updateCaptureUI(isActive) {
    if (isActive) {
      captureDot.classList.add('active');
      captureStatus.textContent = 'Active';
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        </svg>
        Disable Capture Mode
      `;
    } else {
      captureDot.classList.remove('active');
      captureStatus.textContent = 'Off';
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Enable Capture Mode
      `;
    }
  }

  // Check server status and get stats
  async function checkServer() {
    serverDot.classList.remove('active', 'error');
    serverStatus.textContent = 'Checking...';

    try {
      const response = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        serverDot.classList.add('active');
        serverStatus.textContent = 'Connected';
        
        // Try to get stats
        try {
          const statsResponse = await fetch(`${serverUrl}/stats`);
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            capturesCount.textContent = stats.captures || 0;
            tasksCount.textContent = stats.tasks || 0;
            statsSection.style.display = 'grid';
          }
        } catch (e) {
          // Stats endpoint might not exist
        }
      } else {
        throw new Error('Server returned error');
      }
    } catch (e) {
      serverDot.classList.add('error');
      serverStatus.textContent = 'Not connected';
      statsSection.style.display = 'none';
    }
  }

  // Toggle capture mode
  toggleBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
        updateCaptureUI(response?.captureMode);
      }
    } catch (e) {
      console.error('Could not toggle:', e);
    }
  });

  // Save server URL
  saveServerBtn.addEventListener('click', async () => {
    const newUrl = serverUrlInput.value.trim();
    if (newUrl) {
      serverUrl = newUrl;
      await chrome.storage.sync.set({ serverUrl: newUrl });
      
      // Update content script
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'update_server', serverUrl: newUrl });
        }
      } catch (e) {
        // Content script might not be loaded
      }

      checkServer();
      saveServerBtn.textContent = '✓';
      setTimeout(() => {
        saveServerBtn.textContent = 'Save';
      }, 1500);
    }
  });

  // Listen for state changes from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'state_changed') {
      updateCaptureUI(message.captureMode);
    }
  });

  // Initial state
  const captureMode = await getState();
  updateCaptureUI(captureMode);
  checkServer();
});
