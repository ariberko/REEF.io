// List of blocked sites - MUST match the list in background.js and rules.json
const BLOCKED_SITES_DISPLAY = [
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'reddit.com',
  'ynet.com',
  'example.com'
];

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggle-btn');
  const blockedSitesList = document.getElementById('blocked-sites-list');
  const showBlockedBtn = document.getElementById('show-blocked-btn');
  const blockedSitesDiv = document.getElementById('blocked-sites');

  // Function to render the blocked sites list
  function renderBlockedSites() {
    blockedSitesList.innerHTML = '';
    BLOCKED_SITES_DISPLAY.forEach(site => {
      const li = document.createElement('li');
      li.textContent = site;
      blockedSitesList.appendChild(li);
    });
  }

  // Get session state from storage
  function getSessionState(callback) {
    chrome.storage.local.get(['reefSessionActive'], (result) => {
      callback(!!result.reefSessionActive);
    });
  }

  // Set session state in storage
  function setSessionState(active, callback) {
    chrome.storage.local.set({ reefSessionActive: active }, callback);
  }

  // Update button text based on session state
  function updateButton(active) {
    toggleBtn.textContent = active ? 'End Session' : 'Surf Now';
    if (active) {
      toggleBtn.classList.add('active');
    } else {
      toggleBtn.classList.remove('active');
    }
  }

  // Get session state and update button on popup open
  getSessionState(updateButton);

  // Toggle session state on button click
  toggleBtn.addEventListener('click', () => {
    getSessionState((currentState) => {
      const newState = !currentState;
      setSessionState(newState, () => {
        updateButton(newState);
      });
    });
  });

  // Listen for changes to session state
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.reefSessionActive) {
      updateButton(changes.reefSessionActive.newValue);
    }
  });

  // Notify background that popup opened to force ruleset check
  chrome.runtime.sendMessage('popup_opened');

  // Initial render of blocked sites
  renderBlockedSites();

  // Toggle blocked sites list visibility
  showBlockedBtn.addEventListener('click', () => {
    blockedSitesDiv.style.display = blockedSitesDiv.style.display === 'block' ? 'none' : 'block';
  });
}); 