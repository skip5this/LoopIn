(function() {
  // Prevent double-injection
  if (window.__browserBridge) {
    window.__browserBridge.toggle();
    return;
  }

  const CAPTURE_SERVER = 'http://192.168.4.56:3456';

  // ============================================
  // State
  // ============================================

  let captureMode = false;
  let hoveredElement = null;

  // ============================================
  // Styles
  // ============================================

  const styles = document.createElement('style');
  styles.id = 'browser-bridge-styles';
  styles.textContent = `
    .bb-highlight {
      outline: 2px dashed #635bff !important;
      outline-offset: 2px !important;
    }

    .bb-toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #1a1a2e;
      color: #fff;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      animation: bb-slide-in 0.3s ease;
    }

    .bb-toast.bb-success { border-left: 4px solid #10b981; }
    .bb-toast.bb-info { border-left: 4px solid #635bff; }
    .bb-toast.bb-error { border-left: 4px solid #ef4444; }

    @keyframes bb-slide-in {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .bb-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bb-dialog {
      background: #fff;
      border-radius: 12px;
      width: 500px;
      max-width: 90vw;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .bb-dialog-header {
      background: #1a1a2e;
      color: #fff;
      padding: 16px 20px;
      font-weight: 600;
      font-size: 16px;
    }

    .bb-dialog-body {
      padding: 20px;
      overflow-y: auto;
      max-height: 50vh;
    }

    .bb-dialog-body label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: #374151;
    }

    .bb-dialog-body pre {
      background: #f3f4f6;
      color: #1f2937;
      padding: 12px;
      border-radius: 6px;
      font-size: 12px;
      overflow-x: auto;
      margin-bottom: 16px;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .bb-dialog-body textarea {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
      box-sizing: border-box;
      color: #1a1a2e;
      background: #ffffff;
    }

    .bb-dialog-body textarea:focus {
      outline: none;
      border-color: #635bff;
    }

    .bb-dialog-footer {
      padding: 16px 20px;
      background: #f9fafb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .bb-btn {
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      border: none;
    }

    .bb-btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .bb-btn-primary {
      background: #635bff;
      color: #fff;
    }

    .bb-btn:hover {
      opacity: 0.9;
    }

    .bb-indicator {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #635bff;
      color: #fff;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      z-index: 999997;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(99,91,255,0.3);
    }

    .bb-indicator:hover {
      background: #5046e5;
    }
  `;
  document.head.appendChild(styles);

  // ============================================
  // UI Components
  // ============================================

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `bb-toast bb-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'bb-slide-in 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  function showIndicator() {
    let indicator = document.getElementById('bb-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'bb-indicator';
      indicator.className = 'bb-indicator';
      indicator.onclick = toggle;
      document.body.appendChild(indicator);
    }
    indicator.textContent = captureMode ? '🎯 Capture ON (click to disable)' : '⭕ Capture OFF (click to enable)';
    indicator.style.background = captureMode ? '#635bff' : '#6b7280';
  }

  function showDialog(element) {
    const overlay = document.createElement('div');
    overlay.className = 'bb-dialog-overlay';

    const outerHTML = element.outerHTML.slice(0, 800) + (element.outerHTML.length > 800 ? '...' : '');

    overlay.innerHTML = `
      <div class="bb-dialog">
        <div class="bb-dialog-header">🔍 Browser Bridge - Capture Element</div>
        <div class="bb-dialog-body">
          <label>Selected Element:</label>
          <pre>${escapeHtml(outerHTML)}</pre>

          <label>What should Claude do? (optional)</label>
          <textarea id="bb-instruction" placeholder="e.g., make this green, add a hover effect, fix the alignment..."></textarea>
        </div>
        <div class="bb-dialog-footer">
          <button class="bb-btn bb-btn-secondary" id="bb-cancel">Cancel</button>
          <button class="bb-btn bb-btn-secondary" id="bb-capture-only">Capture Only</button>
          <button class="bb-btn bb-btn-primary" id="bb-send">Send with Instruction</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector('#bb-instruction');
    textarea.focus();

    overlay.querySelector('#bb-cancel').onclick = () => overlay.remove();

    overlay.querySelector('#bb-capture-only').onclick = () => {
      captureElement(element);
      overlay.remove();
    };

    overlay.querySelector('#bb-send').onclick = () => {
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
      if (e.target === overlay) overlay.remove();
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
        const classes = el.className.trim().split(/\s+/).filter(c => c && !c.startsWith('bb-'));
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
      url: window.location.href
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
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to capture. Is the server running?', 'error');
      console.error('[browser-bridge]', e);
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
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to send task. Is the server running?', 'error');
      console.error('[browser-bridge]', e);
    }
  }

  // ============================================
  // Event Handlers
  // ============================================

  function handleMouseOver(e) {
    if (!captureMode) return;

    // Ignore our own UI elements
    if (e.target.closest('#bb-indicator') || e.target.closest('.bb-dialog-overlay') || e.target.closest('.bb-toast')) {
      return;
    }

    if (hoveredElement) {
      hoveredElement.classList.remove('bb-highlight');
    }

    hoveredElement = e.target;
    hoveredElement.classList.add('bb-highlight');
  }

  function handleMouseOut(e) {
    if (!captureMode) return;

    if (hoveredElement) {
      hoveredElement.classList.remove('bb-highlight');
      hoveredElement = null;
    }
  }

  function handleClick(e) {
    if (!captureMode) return;

    // Ignore our own UI elements
    if (e.target.closest('#bb-indicator') || e.target.closest('.bb-dialog-overlay') || e.target.closest('.bb-toast')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    el.classList.remove('bb-highlight');

    showDialog(el);
  }

  function handleKeydown(e) {
    // Toggle with Ctrl+Shift+C
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      toggle();
    }

    // Escape to turn off
    if (e.key === 'Escape' && captureMode) {
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
    showToast('Capture mode enabled. Click any element.', 'info');
  }

  function disable() {
    captureMode = false;
    document.removeEventListener('mouseover', handleMouseOver, true);
    document.removeEventListener('mouseout', handleMouseOut, true);
    document.removeEventListener('click', handleClick, true);

    if (hoveredElement) {
      hoveredElement.classList.remove('bb-highlight');
      hoveredElement = null;
    }

    showIndicator();
    showToast('Capture mode disabled.', 'info');
  }

  function toggle() {
    if (captureMode) {
      disable();
    } else {
      enable();
    }
  }

  // ============================================
  // Initialize
  // ============================================

  document.addEventListener('keydown', handleKeydown);

  window.__browserBridge = {
    toggle,
    enable,
    disable,
    isEnabled: () => captureMode
  };

  // Start in capture mode
  enable();

})();
