// LoopIn A11y Module
// Accessibility checking powered by axe-core

(function() {
  'use strict';

  // ============================================
  // State
  // ============================================
  
  let a11yMode = false;
  let watchMode = false;
  let currentViolations = [];
  let issueOverlays = [];
  let observer = null;

  // ============================================
  // Core Scanning
  // ============================================

  async function runScan(context = document) {
    if (typeof axe === 'undefined') {
      console.error('[LoopIn A11y] axe-core not loaded');
      return { violations: [] };
    }

    try {
      const results = await axe.run(context, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'best-practice']
        }
      });
      
      currentViolations = results.violations;
      console.log(`[LoopIn A11y] Found ${currentViolations.length} violations`);
      return results;
    } catch (error) {
      console.error('[LoopIn A11y] Scan error:', error);
      return { violations: [] };
    }
  }

  // ============================================
  // Issue Overlays
  // ============================================

  function clearOverlays() {
    issueOverlays.forEach(overlay => overlay.remove());
    issueOverlays = [];
  }

  function createIssueBadge(element, violations) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    const badge = document.createElement('div');
    badge.className = 'loopin-a11y-badge';
    badge.setAttribute('data-violations', JSON.stringify(violations));
    
    // Position badge at top-right of element
    badge.style.cssText = `
      position: fixed;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.right + window.scrollX - 24}px;
      z-index: 2147483647;
    `;

    // Badge content
    const severity = getHighestSeverity(violations);
    badge.innerHTML = `
      <span class="loopin-a11y-badge-icon ${severity}">${violations.length}</span>
    `;

    // Click handler
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      showIssuePanel(element, violations);
    });

    document.body.appendChild(badge);
    issueOverlays.push(badge);
    
    return badge;
  }

  function getHighestSeverity(violations) {
    const severityOrder = ['critical', 'serious', 'moderate', 'minor'];
    for (const sev of severityOrder) {
      if (violations.some(v => v.impact === sev)) return sev;
    }
    return 'minor';
  }

  function showIssueOverlays() {
    clearOverlays();
    
    // Group violations by element
    const elementViolations = new Map();
    
    currentViolations.forEach(violation => {
      violation.nodes.forEach(node => {
        const element = document.querySelector(node.target[0]);
        if (element) {
          if (!elementViolations.has(element)) {
            elementViolations.set(element, []);
          }
          elementViolations.get(element).push({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            help: violation.help,
            helpUrl: violation.helpUrl,
            failureSummary: node.failureSummary
          });
        }
      });
    });

    // Create badges for each element
    elementViolations.forEach((violations, element) => {
      createIssueBadge(element, violations);
    });

    updateStatusIndicator();
  }

  // ============================================
  // Issue Panel
  // ============================================

  function showIssuePanel(element, violations) {
    // Remove existing panel
    document.querySelectorAll('.loopin-a11y-panel').forEach(p => p.remove());

    const panel = document.createElement('div');
    panel.className = 'loopin-a11y-panel';

    const violationsList = violations.map(v => `
      <div class="loopin-a11y-violation ${v.impact}">
        <div class="loopin-a11y-violation-header">
          <span class="loopin-a11y-impact ${v.impact}">${v.impact}</span>
          <span class="loopin-a11y-id">${v.id}</span>
        </div>
        <p class="loopin-a11y-help">${v.help}</p>
        <p class="loopin-a11y-description">${v.description}</p>
        ${v.failureSummary ? `<div class="loopin-a11y-fix"><strong>How to fix:</strong><br>${formatFailureSummary(v.failureSummary)}</div>` : ''}
        <a href="${v.helpUrl}" target="_blank" class="loopin-a11y-learn">Learn more →</a>
      </div>
    `).join('');

    panel.innerHTML = `
      <div class="loopin-a11y-panel-header">
        <span>🔍 ${violations.length} Accessibility Issue${violations.length > 1 ? 's' : ''}</span>
        <button class="loopin-a11y-close">×</button>
      </div>
      <div class="loopin-a11y-panel-body">
        ${violationsList}
      </div>
      <div class="loopin-a11y-panel-footer">
        <button class="loopin-a11y-send-to-claude">Send to Claude for Fix</button>
      </div>
    `;

    // Position panel near element
    const rect = element.getBoundingClientRect();
    panel.style.cssText = `
      position: fixed;
      top: ${Math.min(rect.bottom + 10, window.innerHeight - 400)}px;
      left: ${Math.min(rect.left, window.innerWidth - 350)}px;
      z-index: 2147483647;
    `;

    document.body.appendChild(panel);

    // Event listeners
    panel.querySelector('.loopin-a11y-close').addEventListener('click', () => panel.remove());
    
    panel.querySelector('.loopin-a11y-send-to-claude').addEventListener('click', () => {
      sendToClaudeForFix(element, violations);
      panel.remove();
    });

    // Highlight the element
    element.classList.add('loopin-a11y-highlight');
    panel.addEventListener('remove', () => {
      element.classList.remove('loopin-a11y-highlight');
    });
  }

  function formatFailureSummary(summary) {
    return summary
      .replace(/Fix any of the following:/g, '<strong>Fix any of:</strong>')
      .replace(/Fix all of the following:/g, '<strong>Fix all of:</strong>')
      .replace(/\n/g, '<br>');
  }

  // ============================================
  // Send to Claude Integration
  // ============================================

  async function sendToClaudeForFix(element, violations) {
    const data = {
      element: {
        tagName: element.tagName.toLowerCase(),
        outerHTML: element.outerHTML.slice(0, 2000),
        selector: getUniqueSelector(element)
      },
      a11yIssues: violations,
      instruction: `Fix these accessibility issues:\n${violations.map(v => `- ${v.help} (${v.impact})`).join('\n')}`
    };

    try {
      const serverUrl = await getServerUrl();
      const response = await fetch(`${serverUrl}/capture/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        showToast('Sent to Claude for fix!', 'success');
      } else {
        throw new Error('Server error');
      }
    } catch (e) {
      showToast('Failed to send. Is the server running?', 'error');
    }
  }

  function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        path.unshift(`#${el.id}`);
        break;
      }
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\s+/).filter(c => c && !c.startsWith('loopin-'));
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }
      path.unshift(selector);
      el = el.parentNode;
      if (path.length > 4) break;
    }
    return path.join(' > ');
  }

  async function getServerUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['serverUrl'], (result) => {
        resolve(result.serverUrl || 'http://localhost:3456');
      });
    });
  }

  // ============================================
  // Status Indicator
  // ============================================

  function updateStatusIndicator() {
    let indicator = document.getElementById('loopin-a11y-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'loopin-a11y-indicator';
      indicator.className = 'loopin-a11y-indicator';
      document.body.appendChild(indicator);
    }

    const totalIssues = currentViolations.reduce((sum, v) => sum + v.nodes.length, 0);
    const critical = currentViolations.filter(v => v.impact === 'critical').length;
    const serious = currentViolations.filter(v => v.impact === 'serious').length;

    if (totalIssues === 0) {
      indicator.innerHTML = `
        <span class="loopin-a11y-status-icon good">✓</span>
        <span>No issues found</span>
      `;
      indicator.className = 'loopin-a11y-indicator good';
    } else {
      indicator.innerHTML = `
        <span class="loopin-a11y-status-icon ${critical > 0 ? 'critical' : serious > 0 ? 'serious' : 'warning'}">
          ${totalIssues}
        </span>
        <span>${totalIssues} issue${totalIssues > 1 ? 's' : ''} found</span>
      `;
      indicator.className = `loopin-a11y-indicator ${critical > 0 ? 'critical' : serious > 0 ? 'serious' : 'warning'}`;
    }

    indicator.onclick = () => {
      if (a11yMode) {
        showIssueOverlays();
      }
    };
  }

  function hideStatusIndicator() {
    const indicator = document.getElementById('loopin-a11y-indicator');
    if (indicator) indicator.remove();
  }

  // ============================================
  // Watch Mode (MutationObserver)
  // ============================================

  function startWatchMode() {
    if (observer) return;

    let debounceTimer = null;
    
    observer = new MutationObserver((mutations) => {
      // Debounce to avoid excessive scanning
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        console.log('[LoopIn A11y] DOM changed, re-scanning...');
        await runScan();
        if (a11yMode) {
          showIssueOverlays();
        } else {
          updateStatusIndicator();
        }
      }, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-label', 'alt', 'role']
    });

    console.log('[LoopIn A11y] Watch mode started');
  }

  function stopWatchMode() {
    if (observer) {
      observer.disconnect();
      observer = null;
      console.log('[LoopIn A11y] Watch mode stopped');
    }
  }

  // ============================================
  // Toast Notifications
  // ============================================

  function showToast(message, type = 'info') {
    const existing = document.querySelector('.loopin-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `loopin-toast loopin-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'loopin-slide-in 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ============================================
  // Public API
  // ============================================

  async function enableA11yMode() {
    a11yMode = true;
    console.log('[LoopIn A11y] A11y mode enabled');
    showToast('A11y mode enabled', 'info');
    
    await runScan();
    showIssueOverlays();
  }

  function disableA11yMode() {
    a11yMode = false;
    clearOverlays();
    hideStatusIndicator();
    document.querySelectorAll('.loopin-a11y-panel').forEach(p => p.remove());
    console.log('[LoopIn A11y] A11y mode disabled');
    showToast('A11y mode disabled', 'info');
  }

  async function enableWatchMode() {
    watchMode = true;
    startWatchMode();
    await runScan();
    updateStatusIndicator();
    showToast('Watch mode enabled', 'info');
  }

  function disableWatchMode() {
    watchMode = false;
    stopWatchMode();
    hideStatusIndicator();
    showToast('Watch mode disabled', 'info');
  }

  function toggleA11yMode() {
    if (a11yMode) {
      disableA11yMode();
    } else {
      enableA11yMode();
    }
    return a11yMode;
  }

  function toggleWatchMode() {
    if (watchMode) {
      disableWatchMode();
    } else {
      enableWatchMode();
    }
    return watchMode;
  }

  // ============================================
  // Expose API
  // ============================================

  window.__loopInA11y = {
    scan: runScan,
    enableA11yMode,
    disableA11yMode,
    toggleA11yMode,
    enableWatchMode,
    disableWatchMode,
    toggleWatchMode,
    getViolations: () => currentViolations,
    isA11yMode: () => a11yMode,
    isWatchMode: () => watchMode
  };

  console.log('[LoopIn A11y] Module loaded. Use window.__loopInA11y to control.');

})();
