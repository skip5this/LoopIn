// LoopIn Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Capture mode elements
  const toggleCaptureBtn = document.getElementById('toggle-capture-btn');
  const captureStatus = document.getElementById('capture-status');
  const captureDot = document.getElementById('capture-dot');

  // Server elements
  const serverStatus = document.getElementById('server-status');
  const serverDot = document.getElementById('server-dot');
  const serverUrlInput = document.getElementById('server-url');
  const saveServerBtn = document.getElementById('save-server');

  let serverUrl = 'http://localhost:3456';

  // Load saved server URL
  const stored = await chrome.storage.sync.get(['serverUrl']);
  if (stored.serverUrl) {
    serverUrl = stored.serverUrl;
    serverUrlInput.value = serverUrl;
  }

  // ============================================
  // Capture Mode
  // ============================================

  async function getCaptureState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'get_state' });
        return response?.captureMode || false;
      }
    } catch (e) {
      console.log('Could not get capture state:', e);
    }
    return false;
  }

  function updateCaptureUI(isActive) {
    if (isActive) {
      captureDot.classList.add('active');
      captureStatus.textContent = 'Active';
      toggleCaptureBtn.innerHTML = '⏹️ Disable Capture Mode';
    } else {
      captureDot.classList.remove('active');
      captureStatus.textContent = 'Off';
      toggleCaptureBtn.innerHTML = '🔵 Enable Capture Mode';
    }
  }

  toggleCaptureBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
        updateCaptureUI(response?.captureMode);
      }
    } catch (e) {
      console.error('Could not toggle capture:', e);
    }
  });

  // ============================================
  // Server
  // ============================================

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
      } else {
        throw new Error('Server returned error');
      }
    } catch (e) {
      serverDot.classList.add('error');
      serverStatus.textContent = 'Not connected';
    }
  }

  saveServerBtn.addEventListener('click', async () => {
    const newUrl = serverUrlInput.value.trim();
    if (newUrl) {
      serverUrl = newUrl;
      await chrome.storage.sync.set({ serverUrl: newUrl });
      
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

  // ============================================
  // Message Listener
  // ============================================

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'state_changed') {
      updateCaptureUI(message.captureMode);
    }
  });

  // ============================================
  // Initialize
  // ============================================

  const captureMode = await getCaptureState();
  updateCaptureUI(captureMode);
  checkServer();
});
