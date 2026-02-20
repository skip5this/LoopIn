// LoopIn Content Script
// Injected into all pages to enable element capture

(function() {
  'use strict';

  // ============================================
  // Configuration
  // ============================================
  
  const DEFAULT_SERVER = 'http://localhost:3456';
  let CAPTURE_SERVER = DEFAULT_SERVER;
  let controlBarCollapsed = false;
  let pendingTaskCount = 0;

  // Load settings from storage
  chrome.storage.sync.get(['serverUrl', 'controlBarCollapsed'], (result) => {
    if (result.serverUrl) CAPTURE_SERVER = result.serverUrl;
    if (result.controlBarCollapsed) controlBarCollapsed = result.controlBarCollapsed;
  });

  // ============================================
  // State
  // ============================================

  let captureMode = false;
  let textSelectMode = false;
  let hoveredElement = null;
  let videosPaused = false;
  let settingsPanelOpen = false;
  let taskListOpen = false;
  let recentCaptures = [];

  // Proxy fetch through background script to bypass mixed content on HTTPS pages
  function serverFetch(url, options) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'proxy_fetch', url, options },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { ok: false, error: 'No response' });
          }
        }
      );
    });
  }

  // ============================================
  // Control Bar
  // ============================================

  function createControlBar() {
    const oldIndicator = document.getElementById('loopin-indicator');
    if (oldIndicator) oldIndicator.remove();

    let bar = document.getElementById('loopin-control-bar');
    if (bar) return bar;

    bar = document.createElement('div');
    bar.id = 'loopin-control-bar';
    bar.className = 'loopin-control-bar';
    
    bar.innerHTML = `
      <div class="loopin-bar-collapsed" id="loopin-bar-collapsed">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span class="loopin-bar-badge" id="loopin-badge" style="display:none">0</span>
      </div>
      <div class="loopin-bar-expanded" id="loopin-bar-expanded">
        <button class="loopin-bar-btn loopin-bar-btn-capture" id="loopin-btn-capture" title="Toggle capture mode (⌘⇧C)">
          <span class="loopin-capture-dot" id="loopin-capture-dot"></span>
          <span class="loopin-bar-label">Capture</span>
        </button>
        <button class="loopin-bar-btn" id="loopin-btn-pause" title="Pause/resume videos">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>
          </svg>
        </button>
        <button class="loopin-bar-btn" id="loopin-btn-tasks" title="Recent captures">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          </svg>
          <span class="loopin-bar-badge loopin-tasks-badge" id="loopin-tasks-badge" style="display:none">0</span>
        </button>
        <button class="loopin-bar-btn" id="loopin-btn-settings" title="Settings">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="loopin-bar-btn" id="loopin-btn-minimize" title="Minimize">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(bar);

    // Event listeners
    document.getElementById('loopin-bar-collapsed').onclick = () => expandBar();
    document.getElementById('loopin-btn-capture').onclick = () => toggle();
    document.getElementById('loopin-btn-pause').onclick = () => toggleVideoPause();
    document.getElementById('loopin-btn-tasks').onclick = () => toggleTaskList();
    document.getElementById('loopin-btn-settings').onclick = () => toggleSettings();
    document.getElementById('loopin-btn-minimize').onclick = () => collapseBar();

    if (controlBarCollapsed) {
      bar.classList.add('loopin-collapsed');
    }

    checkPendingTasks();
    return bar;
  }

  function collapseBar() {
    const bar = document.getElementById('loopin-control-bar');
    if (bar) {
      bar.classList.add('loopin-collapsed');
      controlBarCollapsed = true;
      chrome.storage.sync.set({ controlBarCollapsed: true });
    }
  }

  function expandBar() {
    const bar = document.getElementById('loopin-control-bar');
    if (bar) {
      bar.classList.remove('loopin-collapsed');
      controlBarCollapsed = false;
      chrome.storage.sync.set({ controlBarCollapsed: false });
    }
  }

  function updateControlBar() {
    const dot = document.getElementById('loopin-capture-dot');
    const captureBtn = document.getElementById('loopin-btn-capture');
    if (dot && captureBtn) {
      if (captureMode) {
        dot.classList.add('loopin-active');
        captureBtn.classList.add('loopin-active');
      } else {
        dot.classList.remove('loopin-active');
        captureBtn.classList.remove('loopin-active');
      }
    }

    const pauseBtn = document.getElementById('loopin-btn-pause');
    if (pauseBtn) {
      if (videosPaused) {
        pauseBtn.classList.add('loopin-active');
        // Swap to play icon
        pauseBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      } else {
        pauseBtn.classList.remove('loopin-active');
        // Swap to pause icon
        pauseBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
      }
    }

    const settingsBtn = document.getElementById('loopin-btn-settings');
    if (settingsBtn) {
      if (settingsPanelOpen) {
        settingsBtn.classList.add('loopin-active');
      } else {
        settingsBtn.classList.remove('loopin-active');
      }
    }
  }

  function updateBadge(count) {
    const badge = document.getElementById('loopin-badge');
    if (badge) {
      pendingTaskCount = count;
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  async function checkPendingTasks() {
    try {
      const res = await serverFetch(`${CAPTURE_SERVER}/stats`);
      if (res.ok) {
        const stats = res.data;
        updateBadge(stats.pendingTasks || 0);
      }
    } catch (e) {
      // Server not running
    }
  }

  // ============================================
  // Video Pause
  // ============================================

  function toggleVideoPause() {
    const videos = document.querySelectorAll('video');
    videosPaused = !videosPaused;
    videos.forEach(v => videosPaused ? v.pause() : v.play());
    updateControlBar();
    showToast(videosPaused ? 'Videos paused' : 'Videos resumed', 'info');
  }

  // ============================================
  // Text Selection Capture
  // ============================================

  function toggleTextSelect() {
    if (textSelectMode) {
      disableTextSelect();
    } else {
      if (captureMode) disable();
      enableTextSelect();
    }
  }

  function enableTextSelect() {
    textSelectMode = true;
    document.addEventListener('mouseup', handleTextSelection, true);
    updateControlBar();
    showToast('Text select mode on — highlight text and release', 'info');
  }

  function disableTextSelect() {
    textSelectMode = false;
    document.removeEventListener('mouseup', handleTextSelection, true);
    updateControlBar();
    showToast('Text select mode off', 'info');
  }

  function handleTextSelection(e) {
    if (!textSelectMode) return;
    if (e.target.closest('#loopin-control-bar') ||
        e.target.closest('.loopin-dialog-overlay') ||
        e.target.closest('.loopin-settings-panel') ||
        e.target.closest('.loopin-task-list-panel')) return;

    const selection = window.getSelection();
    const text = selection.toString().trim();
    if (!text || text.length < 2) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer;

    showTextCaptureDialog(text, container);
  }

  function showTextCaptureDialog(selectedText, contextElement) {
    const overlay = document.createElement('div');
    overlay.className = 'loopin-dialog-overlay';

    const truncated = selectedText.length > 300 ? selectedText.slice(0, 300) + '...' : selectedText;

    overlay.innerHTML = `
      <div class="loopin-dialog">
        <div class="loopin-dialog-header">
          <div class="loopin-dialog-element-info" style="margin:0">
            <div class="loopin-dialog-element-tag">TXT</div>
            <div class="loopin-dialog-element-size">${selectedText.length} chars</div>
          </div>
          <button class="loopin-dialog-close" id="loopin-dialog-close">×</button>
        </div>
        <div class="loopin-dialog-body">
          <div class="loopin-dialog-preview">
            <pre>"${escapeHtml(truncated)}"</pre>
          </div>
          <div class="loopin-dialog-input-wrap">
            <textarea id="loopin-instruction" placeholder='Add context... "Make this green"' rows="3"></textarea>
          </div>
        </div>
        <div class="loopin-dialog-footer">
          <button class="loopin-dialog-btn loopin-dialog-btn-ghost" id="loopin-capture-only">Capture</button>
          <button class="loopin-dialog-btn loopin-dialog-btn-primary" id="loopin-send">Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#loopin-instruction');
    setTimeout(() => textarea.focus(), 100);

    const captureData = {
      type: 'text_selection',
      selectedText: selectedText,
      context: {
        tagName: contextElement.tagName.toLowerCase(),
        selector: getUniqueSelector(contextElement),
        surroundingText: (contextElement.innerText || '').slice(0, 500)
      },
      url: window.location.href,
      title: document.title
    };

    overlay.querySelector('#loopin-dialog-close').onclick = () => overlay.remove();

    overlay.querySelector('#loopin-capture-only').onclick = async () => {
      await sendTextCapture(captureData);
      overlay.remove();
    };

    overlay.querySelector('#loopin-send').onclick = async () => {
      const instruction = textarea.value.trim();
      if (instruction) captureData.instruction = instruction;
      await sendTextCapture(captureData);
      overlay.remove();
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handleEscape); }
    };
    document.addEventListener('keydown', handleEscape);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) overlay.querySelector('#loopin-send').click();
    };
  }

  async function sendTextCapture(data) {
    try {
      const endpoint = data.instruction ? '/capture/task' : '/capture/element';
      const body = data.instruction
        ? { element: data, instruction: data.instruction }
        : data;

      const response = await serverFetch(`${CAPTURE_SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const label = data.selectedText.slice(0, 40) + (data.selectedText.length > 40 ? '...' : '');
        showToast(`Captured: "${label}"`, 'success');
        addToRecentCaptures({ type: 'text', text: data.selectedText, instruction: data.instruction, time: Date.now() });
        checkPendingTasks();
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to capture. Is the server running?', 'error');
    }
  }

  // ============================================
  // Task List Panel
  // ============================================

  function addToRecentCaptures(item) {
    recentCaptures.unshift(item);
    if (recentCaptures.length > 50) recentCaptures.pop();
    updateTasksBadge();
    if (taskListOpen) renderTaskList();
  }

  function updateTasksBadge() {
    const badge = document.getElementById('loopin-tasks-badge');
    const tasksBtn = document.getElementById('loopin-btn-tasks');
    if (badge) {
      if (recentCaptures.length > 0) {
        badge.textContent = recentCaptures.length;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
    // Update tasks button active state
    if (tasksBtn) {
      if (taskListOpen) {
        tasksBtn.classList.add('loopin-active');
      } else {
        tasksBtn.classList.remove('loopin-active');
      }
    }
  }

  function toggleTaskList() {
    const existing = document.getElementById('loopin-task-list-panel');
    if (existing) existing.remove();

    if (taskListOpen) {
      taskListOpen = false;
      updateTasksBadge();
      return;
    }

    taskListOpen = true;
    updateTasksBadge();
    renderTaskList();
  }

  function renderTaskList() {
    let panel = document.getElementById('loopin-task-list-panel');
    if (panel) panel.remove();

    panel = document.createElement('div');
    panel.id = 'loopin-task-list-panel';
    panel.className = 'loopin-task-list-panel';

    const items = recentCaptures.length === 0
      ? '<div class="loopin-task-empty">No captures yet.</div>'
      : recentCaptures.map((c, i) => {
          const icon = c.type === 'text' ? 'T' : '◻';
          const label = c.type === 'text'
            ? `"${escapeHtml((c.text || '').slice(0, 50))}${(c.text || '').length > 50 ? '...' : ''}"`
            : `&lt;${escapeHtml(c.tagName || 'element')}&gt;`;
          return `
            <div class="loopin-task-item">
              <span class="loopin-task-icon">${icon}</span>
              <div class="loopin-task-content">
                <div class="loopin-task-label">${label}</div>
              </div>
            </div>
          `;
        }).join('');

    panel.innerHTML = `
      <div class="loopin-settings-header">
        <span>Captures (${recentCaptures.length})</span>
        ${recentCaptures.length > 0 ? '<button class="loopin-task-send-all" id="loopin-tasks-send-all">Send all</button>' : ''}
      </div>
      <div class="loopin-task-list-body">${items}</div>
    `;

    document.body.appendChild(panel);

    const sendAllBtn = document.getElementById('loopin-tasks-send-all');
    if (sendAllBtn) {
      sendAllBtn.onclick = () => {
        recentCaptures = [];
        taskListOpen = false;
        const existingPanel = document.getElementById('loopin-task-list-panel');
        if (existingPanel) existingPanel.remove();
        updateTasksBadge();
        showToast('All captures sent', 'success');
      };
    }
  }

  // ============================================
  // Settings Panel (Connect to MCP)
  // ============================================

  function closeSettings() {
    const panel = document.getElementById('loopin-settings-panel');
    if (panel) panel.remove();
    settingsPanelOpen = false;
    updateControlBar();
  }

  function toggleSettings() {
    const existing = document.getElementById('loopin-settings-panel');
    if (existing) existing.remove();

    if (settingsPanelOpen) {
      settingsPanelOpen = false;
      updateControlBar();
      return;
    }

    settingsPanelOpen = true;
    updateControlBar();

    const panel = document.createElement('div');
    panel.id = 'loopin-settings-panel';
    panel.className = 'loopin-settings-panel';

    panel.innerHTML = `
      <div class="loopin-settings-header">
        <div>
          <div>Connect to MCP</div>
          <div class="loopin-settings-subtitle">Link LoopIn to your coding agent</div>
        </div>
        <button class="loopin-settings-close" id="loopin-settings-close">×</button>
      </div>
      <div class="loopin-settings-body">
        <div class="loopin-settings-status-row" id="loopin-connection-row">
          <span class="loopin-settings-status-dot" id="loopin-server-dot"></span>
          <span class="loopin-settings-status-text" id="loopin-server-status-text">Checking...</span>
        </div>
        <p class="loopin-settings-description">Add LoopIn as an MCP server in your agent's config to send captures directly.</p>
        <div class="loopin-settings-server-box">
          <div class="loopin-settings-server-label">Server address</div>
          <div class="loopin-settings-server-url" id="loopin-server-display">${CAPTURE_SERVER.replace('http://', 'ws://').replace(':3456', ':3456')}</div>
        </div>
        <a href="https://github.com/skip5this/LoopIn#setup" target="_blank" rel="noopener noreferrer" style="
          display: block; text-align: center; padding: 8px 0; border-radius: 8px;
          background: #9E96B8; color: #1a1a1a; text-decoration: none;
          font-size: 12px; font-weight: 500; transition: all 0.15s ease;
        ">View setup guide</a>
      </div>
    `;

    document.body.appendChild(panel);

    checkServerConnection();
    document.getElementById('loopin-settings-close').onclick = () => closeSettings();
  }

  async function checkServerConnection() {
    const dot = document.getElementById('loopin-server-dot');
    const text = document.getElementById('loopin-server-status-text');

    try {
      const res = await serverFetch(`${CAPTURE_SERVER}/health`);
      if (res.ok) {
        if (dot) { dot.classList.add('loopin-connected'); dot.classList.remove('loopin-disconnected'); }
        if (text) text.textContent = 'Connected';
      } else {
        throw new Error('Not ok');
      }
    } catch (e) {
      if (dot) { dot.classList.add('loopin-disconnected'); dot.classList.remove('loopin-connected'); }
      if (text) text.textContent = 'Not connected';
    }
  }

  // ============================================
  // Toast
  // ============================================

  function showToast(message, type = 'info') {
    document.querySelectorAll('.loopin-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `loopin-toast loopin-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  // ============================================
  // Capture Dialog (matching landing page demo)
  // ============================================

  function showDialog(element) {
    const overlay = document.createElement('div');
    overlay.className = 'loopin-dialog-overlay';

    const data = getElementData(element);
    const htmlPreview = element.outerHTML.slice(0, 300) + (element.outerHTML.length > 300 ? '...' : '');

    // Build enrichment badges
    let enrichmentHtml = '';
    if (data.accessibility) {
      const a11ySummary = data.accessibility.role || data.accessibility['aria-label'] || 'a11y';
      enrichmentHtml += `<span class="loopin-dialog-badge loopin-badge-a11y" title="${escapeHtml(JSON.stringify(data.accessibility))}">♿ ${escapeHtml(a11ySummary)}</span>`;
    }
    if (data.reactComponents) {
      enrichmentHtml += `<span class="loopin-dialog-badge loopin-badge-react" title="React component path">⚛ ${escapeHtml(data.reactComponents.join(' → '))}</span>`;
    }
    if (data.headingContext) {
      enrichmentHtml += `<span class="loopin-dialog-badge loopin-badge-context" title="Nearest heading"># ${escapeHtml(data.headingContext.text.slice(0, 40))}</span>`;
    }

    // Video frame data
    let videoFrameHtml = '';
    const videoEl = element.tagName === 'VIDEO' ? element : element.closest('video');
    if (videoEl) {
      videoFrameHtml = `<span class="loopin-dialog-video-frame">▶ ${videoEl.currentTime.toFixed(1)}s / ${videoEl.duration.toFixed(1)}s</span>`;
      // Also attach to data for capture
      data.videoFrame = { currentTime: videoEl.currentTime, duration: videoEl.duration, paused: videoEl.paused };
    }

    overlay.innerHTML = `
      <div class="loopin-dialog">
        <div class="loopin-dialog-header">
          <div class="loopin-dialog-element-info" style="margin:0">
            <div class="loopin-dialog-element-tag">${data.tagName}</div>
            <div class="loopin-dialog-element-size">${data.boundingRect.width}×${data.boundingRect.height}</div>
            ${videoFrameHtml}
          </div>
          <button class="loopin-dialog-close" id="loopin-dialog-close">×</button>
        </div>
        <div class="loopin-dialog-body">
          ${enrichmentHtml ? `<div class="loopin-dialog-enrichment">${enrichmentHtml}</div>` : ''}
          <div class="loopin-dialog-input-wrap">
            <textarea id="loopin-instruction" placeholder='Add context... "Make this green"' rows="3"></textarea>
          </div>
        </div>
        <div class="loopin-dialog-footer">
          <button class="loopin-dialog-btn loopin-dialog-btn-ghost" id="loopin-capture-only">Capture</button>
          <button class="loopin-dialog-btn loopin-dialog-btn-primary" id="loopin-send">Send</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#loopin-instruction');
    setTimeout(() => textarea.focus(), 100);

    overlay.querySelector('#loopin-dialog-close').onclick = () => overlay.remove();

    overlay.querySelector('#loopin-capture-only').onclick = () => {
      captureElement(element);
      overlay.remove();
    };

    overlay.querySelector('#loopin-send').onclick = () => {
      const instruction = textarea.value.trim();
      if (instruction) {
        captureTask(element, instruction);
      } else {
        captureElement(element);
      }
      overlay.remove();
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    textarea.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        overlay.querySelector('#loopin-send').click();
      }
    };
  }

  // ============================================
  // Utilities
  // ============================================

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;

    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.tagName.toLowerCase();

      if (el.id) {
        selector = `#${el.id}`;
        path.unshift(selector);
        break;
      }

      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c && !c.startsWith('loopin-'));
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }

      const siblings = el.parentNode ? Array.from(el.parentNode.children).filter(e => e.tagName === el.tagName) : [];
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        selector += `:nth-of-type(${index})`;
      }

      path.unshift(selector);
      el = el.parentNode;

      if (path.length > 4) break;
    }

    return path.join(' > ');
  }

  function getRelevantStyles(el) {
    const computed = getComputedStyle(el);
    const props = [
      'color', 'backgroundColor', 'backgroundImage',
      'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'borderRadius', 'borderWidth', 'borderColor', 'borderStyle',
      'boxShadow', 'opacity', 'transform',
      'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
      'width', 'height', 'maxWidth', 'maxHeight'
    ];

    const styles = {};
    for (const prop of props) {
      const value = computed[prop];
      if (value && value !== 'none' && value !== 'normal' && value !== '0px' && value !== 'auto' && value !== 'rgba(0, 0, 0, 0)') {
        styles[prop] = value;
      }
    }
    return styles;
  }

  function getAccessibilityData(el) {
    const a11y = {};
    const role = el.getAttribute('role');
    if (role) a11y.role = role;
    
    const ariaAttrs = ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded',
      'aria-hidden', 'aria-live', 'aria-required', 'aria-disabled', 'aria-checked',
      'aria-selected', 'aria-haspopup', 'aria-controls', 'aria-pressed'];
    ariaAttrs.forEach(attr => {
      const val = el.getAttribute(attr);
      if (val) a11y[attr] = val;
    });
    
    if (el.tagName === 'IMG' || el.tagName === 'INPUT') {
      const alt = el.getAttribute('alt');
      if (alt !== null) a11y.alt = alt;
    }
    if (el.tabIndex >= 0) a11y.tabIndex = el.tabIndex;
    if (el.title) a11y.title = el.title;
    
    return Object.keys(a11y).length > 0 ? a11y : null;
  }

  function getDataAttributes(el) {
    const data = {};
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-') && !attr.name.startsWith('data-loopin')) {
        data[attr.name] = attr.value;
      }
    });
    return Object.keys(data).length > 0 ? data : null;
  }

  function getHeadingContext(el) {
    let node = el;
    while (node && node !== document.body) {
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (/^H[1-6]$/.test(sibling.tagName)) {
          return { tag: sibling.tagName.toLowerCase(), text: (sibling.innerText || '').slice(0, 100) };
        }
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let closest = null;
    let closestDist = Infinity;
    const elRect = el.getBoundingClientRect();
    headings.forEach(h => {
      const hRect = h.getBoundingClientRect();
      const dist = Math.abs(hRect.top - elRect.top);
      if (dist < closestDist && hRect.top <= elRect.top) {
        closestDist = dist;
        closest = h;
      }
    });
    if (closest) {
      return { tag: closest.tagName.toLowerCase(), text: (closest.innerText || '').slice(0, 100) };
    }
    return null;
  }

  function getReactComponentHierarchy(el) {
    try {
      if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) return null;

      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
      if (!fiberKey) return null;

      let fiber = el[fiberKey];
      const components = [];
      
      while (fiber && components.length < 10) {
        if (fiber.type && typeof fiber.type === 'function') {
          const name = fiber.type.displayName || fiber.type.name;
          if (name && !name.startsWith('_')) {
            components.unshift(name);
          }
        } else if (fiber.type && typeof fiber.type === 'object' && fiber.type.$$typeof) {
          const inner = fiber.type.render || fiber.type.type;
          if (inner) {
            const name = inner.displayName || inner.name;
            if (name) components.unshift(name);
          }
        }
        fiber = fiber.return;
      }

      return components.length > 0 ? components : null;
    } catch (e) {
      return null;
    }
  }

  function getElementData(el) {
    const rect = el.getBoundingClientRect();
    const data = {
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.className || '',
      selector: getUniqueSelector(el),
      outerHTML: el.outerHTML.slice(0, 3000),
      innerText: (el.innerText || '').slice(0, 200),
      computedStyles: getRelevantStyles(el),
      boundingRect: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      url: window.location.href,
      title: document.title
    };

    const a11y = getAccessibilityData(el);
    if (a11y) data.accessibility = a11y;

    const dataAttrs = getDataAttributes(el);
    if (dataAttrs) data.dataAttributes = dataAttrs;

    const heading = getHeadingContext(el);
    if (heading) data.headingContext = heading;

    const reactComponents = getReactComponentHierarchy(el);
    if (reactComponents) data.reactComponents = reactComponents;

    return data;
  }

  // ============================================
  // Capture Functions
  // ============================================

  async function captureElement(el) {
    const data = getElementData(el);

    try {
      const response = await serverFetch(`${CAPTURE_SERVER}/capture/element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast(`Captured: <${data.tagName}>`, 'success');
        chrome.runtime.sendMessage({ type: 'captured', data });
        addToRecentCaptures({ type: 'element', tagName: data.tagName, time: Date.now() });
        checkPendingTasks();
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to capture. Is the server running?', 'error');
      console.error('[LoopIn]', e);
    }
  }

  async function captureTask(el, instruction) {
    const data = {
      element: getElementData(el),
      instruction: instruction
    };

    try {
      const response = await serverFetch(`${CAPTURE_SERVER}/capture/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast(`Sent: "${instruction.slice(0, 40)}${instruction.length > 40 ? '...' : ''}"`, 'success');
        chrome.runtime.sendMessage({ type: 'task_sent', data });
        addToRecentCaptures({ type: 'element', tagName: data.element.tagName, instruction, time: Date.now() });
        checkPendingTasks();
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to send. Is the server running?', 'error');
      console.error('[LoopIn]', e);
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  function handleMouseOver(e) {
    if (!captureMode) return;

    if (e.target.closest('#loopin-control-bar') || 
        e.target.closest('.loopin-dialog-overlay') || 
        e.target.closest('.loopin-toast') ||
        e.target.closest('.loopin-settings-panel') ||
        e.target.closest('.loopin-task-list-panel')) {
      return;
    }

    // Skip full-page elements
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'html' || tag === 'body') return;

    if (hoveredElement) {
      hoveredElement.classList.remove('loopin-highlight');
    }

    hoveredElement = e.target;
    hoveredElement.classList.add('loopin-highlight');
  }

  function handleMouseOut(e) {
    if (!captureMode) return;

    if (hoveredElement) {
      hoveredElement.classList.remove('loopin-highlight');
      hoveredElement = null;
    }
  }

  function handleClick(e) {
    if (!captureMode) return;

    if (e.target.closest('#loopin-control-bar') || 
        e.target.closest('.loopin-dialog-overlay') || 
        e.target.closest('.loopin-toast') ||
        e.target.closest('.loopin-settings-panel') ||
        e.target.closest('.loopin-task-list-panel')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    el.classList.remove('loopin-highlight');

    showDialog(el);
  }

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      toggle();
    }

    if (e.key === 'Escape' && captureMode && 
        !document.querySelector('.loopin-dialog-overlay') &&
        !document.querySelector('.loopin-settings-panel') &&
        !document.querySelector('.loopin-task-list-panel')) {
      toggle();
    }
  }

  // ============================================
  // Main Controls
  // ============================================

  function enable() {
    if (textSelectMode) disableTextSelect();
    captureMode = true;
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    updateControlBar();
    showToast('Capture mode on', 'info');
  }

  function disable() {
    captureMode = false;
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);

    if (hoveredElement) {
      hoveredElement.classList.remove('loopin-highlight');
      hoveredElement = null;
    }

    updateControlBar();
    showToast('Capture mode off', 'info');
  }

  function toggle() {
    if (captureMode) {
      disable();
    } else {
      enable();
    }
    chrome.runtime.sendMessage({ type: 'state_changed', captureMode });
  }

  // ============================================
  // Message Handling
  // ============================================

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'toggle') {
      toggle();
      sendResponse({ captureMode });
    } else if (message.type === 'enable') {
      if (!captureMode) enable();
      sendResponse({ captureMode: true });
    } else if (message.type === 'disable') {
      if (captureMode) disable();
      sendResponse({ captureMode: false });
    } else if (message.type === 'get_state') {
      sendResponse({ captureMode });
    } else if (message.type === 'update_server') {
      CAPTURE_SERVER = message.serverUrl;
      sendResponse({ ok: true });
    }
    return true;
  });

  // ============================================
  // Initialize
  // ============================================

  document.addEventListener('keydown', handleKeydown);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createControlBar);
  } else {
    createControlBar();
  }

  window.__loopIn = {
    toggle,
    enable,
    disable,
    isEnabled: () => captureMode
  };

  console.log('[LoopIn] Content script loaded. Press ⌘⇧C to toggle capture mode.');

})();
