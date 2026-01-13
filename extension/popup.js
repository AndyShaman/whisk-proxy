/**
 * Whisk Proxy Auth - Chrome Extension
 * Connects Google Whisk to Claude Code MCP Server
 */

const PROXY_URL = 'http://localhost:3847';
const WHISK_URL = 'https://labs.google/fx/tools/whisk';
const AUTH_SESSION_URL = 'https://labs.google/fx/api/auth/session';

// DOM elements
const statusEl = document.getElementById('status');
const statusTextEl = document.getElementById('statusText');
const infoEl = document.getElementById('info');
const connectBtn = document.getElementById('connectBtn');
const openWhiskBtn = document.getElementById('openWhiskBtn');
const errorEl = document.getElementById('error');

/**
 * Show error message
 */
function showError(message) {
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
  errorEl.style.display = 'none';
}

/**
 * Update status display
 */
function updateStatus(connected, message) {
  statusEl.className = `status ${connected ? 'connected' : 'disconnected'}`;
  statusTextEl.textContent = message;
}

/**
 * Set loading state
 */
function setLoading(loading) {
  if (loading) {
    statusEl.className = 'status loading';
    statusTextEl.textContent = 'Connecting...';
    connectBtn.disabled = true;
    connectBtn.textContent = 'Connecting...';
  } else {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect';
  }
}

/**
 * Check proxy server status
 */
async function checkProxyStatus() {
  try {
    const response = await fetch(`${PROXY_URL}/status`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { connected: false, message: 'Proxy server not running' };
  }
}

/**
 * Get token from current Whisk tab
 */
async function getTokenFromTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        try {
          const response = await fetch('https://labs.google/fx/api/auth/session');
          if (response.ok) {
            const data = await response.json();
            return data.accessToken || data.access_token || null;
          }
          return null;
        } catch (e) {
          return null;
        }
      }
    }, (results) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (results && results[0] && results[0].result) {
        resolve(results[0].result);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Send token to proxy server
 */
async function sendTokenToProxy(token) {
  const response = await fetch(`${PROXY_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to send token');
  }

  return response.json();
}

/**
 * Handle connect button click
 */
async function handleConnect() {
  hideError();
  setLoading(true);

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) {
      throw new Error('No active tab found');
    }

    // Check if we're on labs.google
    if (!tab.url || !tab.url.includes('labs.google')) {
      throw new Error('Please open labs.google/fx/tools/whisk first');
    }

    // Get token from the page
    const token = await getTokenFromTab(tab.id);

    if (!token) {
      throw new Error('Not logged in to Google. Please log in first.');
    }

    // Send token to proxy
    const result = await sendTokenToProxy(token);

    updateStatus(true, result.message || 'Connected!');
    infoEl.textContent = 'You can now use Whisk in Claude Code.';
    connectBtn.textContent = 'Reconnect';

  } catch (error) {
    showError(error.message);
    updateStatus(false, 'Connection failed');
  } finally {
    setLoading(false);
  }
}

/**
 * Handle open Whisk button click
 */
async function handleOpenWhisk() {
  chrome.tabs.create({ url: WHISK_URL });
}

/**
 * Initialize popup
 */
async function init() {
  // Check proxy status
  const proxyStatus = await checkProxyStatus();

  if (!proxyStatus.connected && proxyStatus.message === 'Proxy server not running') {
    updateStatus(false, 'Waiting for generation request...');
    infoEl.textContent = 'Server starts automatically when Claude Code generates an image.';
    // Don't disable button - user might want to connect after starting generation
    connectBtn.disabled = false;
    return;
  }

  if (proxyStatus.connected) {
    updateStatus(true, proxyStatus.message);
    infoEl.textContent = 'You can use Whisk in Claude Code.';
    connectBtn.textContent = 'Reconnect';
  } else {
    updateStatus(false, 'Not connected');
    infoEl.textContent = 'Open labs.google/fx/tools/whisk and click Connect.';
  }

  connectBtn.disabled = false;
}

// Event listeners
connectBtn.addEventListener('click', handleConnect);
openWhiskBtn.addEventListener('click', handleOpenWhisk);

// Initialize
init();
