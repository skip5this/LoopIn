// LoopIn Content Script
// Injected into all pages to enable element capture

(function() {
  'use strict';

  // ============================================
  // Configuration
  // ============================================
  
  const DEFAULT_SERVER = 'http://localhost:3456';
  let CAPTURE_SERVER = DEFAULT_SERVER;

  // Load server URL from storage
  chrome.storage.sync.get(['serverUrl'], (result) => {
    if (result.serverUrl) {
      CAPTURE_SERVER = result.serverUrl;
    }
  });

  // ============================================
  // State
  // ============================================

  let captureMode = false;
  let hoveredElement = null;

  // ============================================
  // UI Components
  // ============================================

  function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.loopin-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `loopin-toast loopin-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'loopin-slide-in 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function showIndicator() {
    let indicator = document.getElementById('loopin-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'loopin-indicator';
      indicator.className = 'loopin-indicator';
      indicator.innerHTML = `
        <span class="loopin-indicator-dot"></span>
        <span class="loopin-indicator-text">Capture OFF</span>
      `;
      indicator.onclick = toggle;
      document.body.appendChild(indicator);
    }

    const text = indicator.querySelector('.loopin-indicator-text');
    if (captureMode) {
      indicator.classList.add('loopin-active');
      text.textContent = 'Click to capture';
    } else {
      indicator.classList.remove('loopin-active');
      text.textContent = 'Capture OFF';
    }
  }

  function hideIndicator() {
    const indicator = document.getElementById('loopin-indicator');
    if (indicator) indicator.remove();
  }

  function showDialog(element) {
    const overlay = document.createElement('div');
    overlay.className = 'loopin-dialog-overlay';

    const outerHTML = element.outerHTML.slice(0, 600) + (element.outerHTML.length > 600 ? '...' : '');

    overlay.innerHTML = `
      <div class="loopin-dialog">
        <div class="loopin-dialog-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          LoopIn - Capture Element
        </div>
        <div class="loopin-dialog-body">
          <label>Selected Element</label>
          <pre>${escapeHtml(outerHTML)}</pre>

          <label>What should Claude do? (optional)</label>
          <textarea id="loopin-instruction" placeholder="e.g., make this button green, fix the alignment, add a hover effect..."></textarea>
        </div>
        <div class="loopin-dialog-footer">
          <button class="loopin-btn loopin-btn-secondary" id="loopin-cancel">Cancel</button>
          <button class="loopin-btn loopin-btn-secondary" id="loopin-capture-only">Capture Only</button>
          <button class="loopin-btn loopin-btn-primary" id="loopin-send">Send to Claude</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#loopin-instruction');
    setTimeout(() => textarea.focus(), 100);

    overlay.querySelector('#loopin-cancel').onclick = () => {
      overlay.remove();
    };

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

    // Close on escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };

    // Enter to send
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

  function getElementData(el) {
    const rect = el.getBoundingClientRect();
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.className || '',
      selector: getUniqueSelector(el),
      outerHTML: el.outerHTML.slice(0, 3000),
      innerText: (el.innerText || '').slice(0, 500),
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
  }

  // ============================================
  // Capture Functions
  // ============================================

  async function captureElement(el) {
    const data = getElementData(el);

    try {
      const response = await fetch(`${CAPTURE_SERVER}/capture/element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast(`Captured: ${data.selector}`, 'success');
        // Notify background script
        chrome.runtime.sendMessage({ type: 'captured', data });
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
      const response = await fetch(`${CAPTURE_SERVER}/capture/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast(`Task sent: "${instruction.slice(0, 30)}${instruction.length > 30 ? '...' : ''}"`, 'success');
        // Notify background script
        chrome.runtime.sendMessage({ type: 'task_sent', data });
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to send task. Is the server running?', 'error');
      console.error('[LoopIn]', e);
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  function handleMouseOver(e) {
    if (!captureMode) return;

    // Ignore our own UI elements
    if (e.target.closest('#loopin-indicator') || 
        e.target.closest('.loopin-dialog-overlay') || 
        e.target.closest('.loopin-toast')) {
      return;
    }

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

    // Ignore our own UI elements
    if (e.target.closest('#loopin-indicator') || 
        e.target.closest('.loopin-dialog-overlay') || 
        e.target.closest('.loopin-toast')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    el.classList.remove('loopin-highlight');

    showDialog(el);
  }

  function handleKeydown(e) {
    // Toggle with Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      toggle();
    }

    // Escape to turn off (only if no dialog is open)
    if (e.key === 'Escape' && captureMode && !document.querySelector('.loopin-dialog-overlay')) {
      toggle();
    }
  }

  // ============================================
  // Main Controls
  // ============================================

  function enable() {
    captureMode = true;
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);
    document.addEventListener('click', handleClick, true);
    showIndicator();
    showToast('Capture mode enabled', 'info');
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

    hideIndicator();
    showToast('Capture mode disabled', 'info');
  }

  function toggle() {
    if (captureMode) {
      disable();
    } else {
      enable();
    }
    // Notify popup of state change
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

  // Expose for debugging
  window.__loopIn = {
    toggle,
    enable,
    disable,
    isEnabled: () => captureMode
  };

  console.log('[LoopIn] Content script loaded. Press Ctrl+Shift+C to toggle capture mode.');

})();
