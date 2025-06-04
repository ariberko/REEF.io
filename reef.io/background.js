// List of blocked sites (used for reference only)
const BLOCKED_SITES = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'reddit.com',
  'ynet.com',
  'example.com'
];

// Generate a unique ID for each log entry (will be added in sendLogToBackend)
// function generateLogId() { /* ... */ } // Removed, handled in sendLogToBackend

// Mapping for MITRE Tactics and Techniques with severity levels
const MITRE_MAPPING = {
    'blocked_site': {
        tactic: 'Defense Evasion',
        technique: 'Network Denial of Service (T1498)',
        severity: 4  // High - Attempting to access blocked site
    },
    'download_attempt': {
        tactic: 'Execution',
        technique: 'Malicious File (T1204)',
        severity: 5  // Critical - Attempting to download files
    },
    'copy': {
        tactic: 'Collection',
        technique: 'Data from Local System (T1005)',
        severity: 3  // Medium - Copying data
    },
    'paste': {
        tactic: 'Collection',
        technique: 'Data from Local System (T1005)',
        severity: 3  // Medium - Pasting data
    },
    'cut': {
        tactic: 'Collection',
        technique: 'Data from Local System (T1005)',
        severity: 3  // Medium - Cutting data
    },
    'site_visit': {
        tactic: 'Discovery',
        technique: 'Browser Information Discovery (T1217)',
        severity: 1  // Info - Regular site visit
    }
};

// Logging function - sends alerts and metadata in the specified format
function sendLogToBackend(action_type, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
      id: `${action_type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      created: timestamp,
      action: action_type,
      url: data.url || (data.downloadItem ? (data.downloadItem.finalUrl || data.downloadItem.url) : undefined),
      title: data.title,
      ...(data.filename && { filename: data.filename }),
      ...(action_type === 'copy' || action_type === 'paste' || action_type === 'cut' ? 
        { copied_pasted_content: data.content } : 
        { content: data.content }),
      severity: MITRE_MAPPING[action_type]?.severity || 1,  // Default to info (1) if no severity defined
      ...(MITRE_MAPPING[action_type] && {
          mitre_tactic: MITRE_MAPPING[action_type].tactic,
          mitre_technique: MITRE_MAPPING[action_type].technique
      })
  };

  const payload = {
    productId: "RF-0x5",
    projectId: "2204",
    product_details: {
      color: "coral blue",
      type: "cybersecurity",
      name: "REEF.io Browser Extension",
      team: "Ari Berkowitz"
    },
    project_details: {
      name: "REEF.io Browser Monitoring",
      desc: "Browser security and monitoring extension"
    },
    assets: [
      {
        ip: "localhost",
        name: "User-Browser",
        memory: "8GB",
        category: "endpoint",
        type: "workstation",
        details: "User's browsing environment",
        status: "active",
        last_seen: new Date().toISOString()
      }
    ],
    metadata: [],
    alerts: []
  };

  // Separate logs into alerts or metadata based on severity
  if (logEntry.severity === 1) {
      // Info level goes to metadata
      payload.metadata.push(logEntry);
  } else {
      // All other severity levels go to alerts
      payload.alerts.push(logEntry);
  }

  try {
    console.log('[REEF DEBUG] About to send payload:', payload);
    fetch("http://cyber.milumentor.com:8001/boot", { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log('[REEF DEBUG] Fetch request successful');
    })
    .catch(error => {
      console.error('[REEF DEBUG] Fetch failed:', error);
    });
  } catch (error) {
    console.error('[REEF DEBUG] Error in sendLogToBackend:', error);
  }
}

// Listen for tab updates to log site visits and blocked site attempts
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        chrome.storage.local.get(['reefSessionActive'], (result) => {
            if (result.reefSessionActive) {
                // Check if the URL matches any blocked site
                const url = new URL(tab.url);
                const isBlocked = BLOCKED_SITES.some(site => url.hostname.includes(site));
                
                if (isBlocked) {
                    // Log as blocked site attempt
                    sendLogToBackend('blocked_site', { 
                        url: tab.url, 
                        title: tab.title,
                        blocked_domain: url.hostname
                    });
                } else {
                    // Log as regular site visit
                    sendLogToBackend('site_visit', { 
                        url: tab.url, 
                        title: tab.title 
                    });
                }
            }
        });
    }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'log' && message.payload) {
        console.log('[REEF DEBUG] Received log message from content script:', message.payload);
        chrome.storage.local.get(['reefSessionActive'], (result) => {
            if (result.reefSessionActive) {
                // Ensure we're sending the complete payload
                const payload = {
                    ...message.payload,
                    url: message.payload.url || sender.tab?.url,
                    title: message.payload.title || sender.tab?.title
                };
                sendLogToBackend(message.payload.action, payload);
            } else {
                console.log('[REEF DEBUG] Session not active, skipping log from content script.');
            }
        });
    }
});

// Cancel downloads when session is active and log the attempt
chrome.downloads.onCreated.addListener(function(downloadItem) {
  chrome.storage.local.get(['reefSessionActive'], (result) => {
    if (result.reefSessionActive) {
      chrome.downloads.cancel(downloadItem.id);
      sendLogToBackend('download_attempt', { downloadItem: downloadItem });
    }
  });
});

// Helper to enable/disable blocking ruleset
function setBlockingRulesetEnabled(enabled) {
  console.log(`[REEF DEBUG] Attempting to set ruleset_1 to ${enabled ? 'ENABLED' : 'DISABLED'}`);
  chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? ['ruleset_1'] : [],
    disableRulesetIds: enabled ? [] : ['ruleset_1']
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[REEF DEBUG] Error updating ruleset:', chrome.runtime.lastError);
    } else {
      console.log(`[REEF DEBUG] Successfully set ruleset_1 to ${enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    chrome.declarativeNetRequest.getEnabledRulesets(console.log);
  });
}

// Listen for changes to session state and update ruleset
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.reefSessionActive !== undefined) {
    console.log('[REEF DEBUG] Storage change detected: reefSessionActive is now', changes.reefSessionActive.newValue);
    if (changes.reefSessionActive.newValue !== undefined) {
        setBlockingRulesetEnabled(changes.reefSessionActive.newValue);
    }
  }
});

// Function to log installed extensions
function logInstalledExtensions() {
  chrome.management.getAll((extensions) => {
    console.log('[REEF DEBUG] Logging installed extensions.');
    const extensionMetadata = extensions.map(ext => ({
      id: `extension-${ext.id}`,
      timestamp: new Date().toISOString(),
      action: 'browser_extension', // Action for individual extension entry
      name: ext.name,
      version: ext.version,
      enabled: ext.enabled,
      type: ext.type // 'extension', 'theme', 'packaged_app', 'hosted_app'
    }));

    const extensionListEntry = {
      id: `extension_list-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Unique ID for the list log
      timestamp: new Date().toISOString(),
      action: 'browser_extensions_list', // Main action for the list
      details: extensionMetadata, // Array of individual extension details
      severity: 1 // Metadata severity
    };

    // Send the list as metadata
    // Since sendLogToBackend expects action_type and data directly,
    // we'll wrap the extensionListEntry in a data object matching the expected structure.
    // We also need to adjust sendLogToBackend or create a dedicated metadata sender
    // if the current sendLogToBackend structure doesn't handle arbitrary metadata well.
    // Let's adjust sendLogToBackend to handle a 'metadata_list' action or similar.

    // Re-evaluating sendLogToBackend - it currently pushes to payload.metadata or payload.alerts
    // based on severity. We can call it with action_type 'browser_extensions_list' and pass the list data.
    // The severity is 1, so it will go into metadata.

    sendLogToBackend('browser_extensions_list', { extension_list: extensionMetadata });
  });
}

// On extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[REEF DEBUG] Extension starting up');
  chrome.storage.local.get(['reefSessionActive'], (result) => {
    const isActive = !!result.reefSessionActive;
    console.log('[REEF DEBUG] Startup session state:', isActive);
    setBlockingRulesetEnabled(isActive);
  });
  // Log installed extensions on startup
  logInstalledExtensions();
});

// On extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[REEF DEBUG] Extension installed');
  chrome.storage.local.get(['reefSessionActive'], (result) => {
    if (result.reefSessionActive === undefined) {
      console.log('[REEF DEBUG] Initializing session state to OFF');
      chrome.storage.local.set({ reefSessionActive: false }, () => {
        setBlockingRulesetEnabled(false);
      });
    } else {
      const isActive = !!result.reefSessionActive;
      console.log('[REEF DEBUG] Installed session state:', isActive);
      setBlockingRulesetEnabled(isActive);
    }
  });
  // Log installed extensions on install/update
  logInstalledExtensions();
});

// Add logging to confirm service worker is running
console.log('[REEF DEBUG] Background service worker script loaded'); 