console.log('[REEF] content.js loaded');

// Show toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = '#2ecc71';
  toast.style.color = '#fff';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '15px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  toast.style.zIndex = 1000000;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1800);
}

// Debounce function to limit event firing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Send log data to background script
function sendLogToBackground(action, content) {
  console.log('[REEF] content.js sending log to background:', action);
  chrome.runtime.sendMessage({ 
    action: 'log', 
    payload: {
      action: action,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      content: content
    }
  });
}

// Handle copy/paste/cut events
function handleClipboardEvent(evt) {
  // Check if extension context is still valid
  if (chrome.runtime?.id === undefined) {
    console.warn('[REEF] Extension context invalidated, skipping clipboard event.');
    return; // Stop execution if context is invalid
  }

  // Check if session is active before proceeding
  chrome.storage.local.get(['reefSessionActive'], (result) => {
    if (!result.reefSessionActive) {
      return; // Don't proceed if session is not active
    }

    let content = '';
    if (evt.type === 'copy' || evt.type === 'cut') {
      content = window.getSelection().toString();
    } else if (evt.type === 'paste') {
      // For paste events, we need to handle both clipboardData and input events
      content = evt.clipboardData?.getData('text') || '';
      
      // If no content from clipboardData, try to get it from the target element
      if (!content && evt.target) {
        content = evt.target.value || evt.target.textContent || '';
      }
    }

    if (content) {
      console.log(`[REEF DEBUG] ${evt.type} event detected with content:`, content);
      showToast(`${evt.type.charAt(0).toUpperCase() + evt.type.slice(1)} is monitored by REEF.io`);
      sendLogToBackground(evt.type, content);
    }
  });
}

// Create debounced version of the handler for copy and cut
const debouncedHandler = debounce(handleClipboardEvent, 1000);

// Attach event listeners to document and shadow roots
function attachEventListeners() {
  // Attach copy and cut event listeners with debounce to the document
  ['copy', 'cut'].forEach(eventType => {
    // Use capture phase to ensure we catch the event before it's handled
    // Attaching to document captures events from the entire DOM
    document.addEventListener(eventType, debouncedHandler, true);
  });

  // Attach paste event listener without debounce to the document
  // Attaching to document captures events from the entire DOM
  document.addEventListener('paste', handleClipboardEvent, true);

  // Note: For events inside Shadow DOMs that do not bubble out,
  // more advanced techniques like iterating through existing shadowRoots
  // or using MutationObservers to detect new ones might be needed.
  // However, for standard copy/paste, capturing on the document is often sufficient.
}

// Initialize event listeners by attaching them to the document once
attachEventListeners();

// Block right-click only when session is active
document.addEventListener('contextmenu', function(e) {
  // Check if extension context is still valid
  if (chrome.runtime?.id === undefined) {
    return; // Stop execution if context is invalid
  }
  chrome.storage.local.get(['reefSessionActive'], (result) => {
    if (result.reefSessionActive) {
      e.preventDefault();
      return false;
    }
  });
}); 