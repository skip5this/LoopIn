// LoopIn Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // Mode tabs
  const modeTabs = document.querySelectorAll('.mode-tab');
  const modePanels = document.querySelectorAll('.mode-panel');

  // Capture mode elements
  const toggleCaptureBtn = document.getElementById('toggle-capture-btn');
  const captureStatus = document.getElementById('capture-status');
  const captureDot = document.getElementById('capture-dot');

  // A11y mode elements
  const toggleA11yBtn = document.getElementById('toggle-a11y-btn');
  const criticalCount = document.getElementById('critical-count');
  const seriousCount = document.getElementById('serious-count');
  const moderateCount = document.getElementById('moderate-count');
  const minorCount = document.getElementById('minor-count');

  // Watch mode elements
  const toggleWatchBtn = document.getElementById('toggle-watch-btn');
  const watchStatus = document.getElementById('watch-status');
  const watchDot = document.getElementById('watch-dot');

  // Server elements
  const serverStatus = document.getElementById('server-status');
  const serverDot = document.getElementById('server-dot');
  const serverUrlInput = document.getElementById('server-url');
  const saveServerBtn = document.getElementById('save-server');

  let serverUrl = 'http://localhost:3456';
  let currentMode = 'capture';
  let a11yModeActive = false;
  let watchModeActive = false;

  // Load saved server URL
  const stored = await chrome.storage.sync.get(['serverUrl']);
  if (stored.serverUrl) {
    serverUrl = stored.serverUrl;
    serverUrlInput.value = serverUrl;
  }

  // ============================================
  // Mode Tab Switching
  // ============================================

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const mode = tab.dataset.mode;
      switchMode(mode);
    });
  });

  function switchMode(mode) {
    currentMode = mode;
    
    // Update tab styles
    modeTabs.forEach(t => {
      t.classList.remove('active');
      if (t.dataset.mode === mode) {
        t.classList.add('active');
      }
    });

    // Show correct panel
    modePanels.forEach(p => {
      p.classList.add('hidden');
    });
    document.getElementById(`${mode}-panel`).classList.remove('hidden');
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
  // A11y Mode
  // ============================================

  async function getA11yState() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'get_a11y_state' });
        return response || {};
      }
    } catch (e) {
      console.log('Could not get a11y state:', e);
    }
    return {};
  }

  function updateA11yStats(violations) {
    if (!violations || violations.length === 0) {
      criticalCount.textContent = '0';
      seriousCount.textContent = '0';
      moderateCount.textContent = '0';
      minorCount.textContent = '0';
      return;
    }

    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    violations.forEach(v => {
      const count = v.nodes ? v.nodes.length : 1;
      if (counts[v.impact] !== undefined) {
        counts[v.impact] += count;
      }
    });

    criticalCount.textContent = counts.critical;
    seriousCount.textContent = counts.serious;
    moderateCount.textContent = counts.moderate;
    minorCount.textContent = counts.minor;
  }

  function updateA11yUI(isActive) {
    a11yModeActive = isActive;
    if (isActive) {
      toggleA11yBtn.innerHTML = '⏹️ Disable A11y Mode';
      toggleA11yBtn.classList.remove('btn-a11y');
      toggleA11yBtn.classList.add('btn-secondary');
    } else {
      toggleA11yBtn.innerHTML = '🔍 Run A11y Scan';
      toggleA11yBtn.classList.add('btn-a11y');
      toggleA11yBtn.classList.remove('btn-secondary');
    }
  }

  toggleA11yBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'toggle_a11y' });
        updateA11yUI(response?.a11yMode);
        if (response?.violations) {
          updateA11yStats(response.violations);
        }
      }
    } catch (e) {
      console.error('Could not toggle a11y:', e);
    }
  });

  // ============================================
  // Watch Mode
  // ============================================

  function updateWatchUI(isActive) {
    watchModeActive = isActive;
    if (isActive) {
      watchDot.classList.add('active');
      watchStatus.textContent = 'Active';
      toggleWatchBtn.innerHTML = '⏹️ Stop Watching';
      toggleWatchBtn.classList.remove('btn-watch');
      toggleWatchBtn.classList.add('btn-secondary');
    } else {
      watchDot.classList.remove('active');
      watchStatus.textContent = 'Off';
      toggleWatchBtn.innerHTML = '👁️ Start Watching';
      toggleWatchBtn.classList.add('btn-watch');
      toggleWatchBtn.classList.remove('btn-secondary');
    }
  }

  toggleWatchBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'toggle_watch' });
        updateWatchUI(response?.watchMode);
        if (response?.violations) {
          updateA11yStats(response.violations);
        }
      }
    } catch (e) {
      console.error('Could not toggle watch:', e);
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
    if (message.type === 'a11y_state_changed') {
      updateA11yUI(message.a11yMode);
      if (message.violations) {
        updateA11yStats(message.violations);
      }
    }
    if (message.type === 'watch_state_changed') {
      updateWatchUI(message.watchMode);
      if (message.violations) {
        updateA11yStats(message.violations);
      }
    }
  });

  // ============================================
  // Initialize
  // ============================================

  const captureMode = await getCaptureState();
  updateCaptureUI(captureMode);
  
  const a11yState = await getA11yState();
  updateA11yUI(a11yState.a11yMode);
  updateWatchUI(a11yState.watchMode);
  if (a11yState.violations) {
    updateA11yStats(a11yState.violations);
  }

  checkServer();
});
