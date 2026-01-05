/**
 * SynchroPeer - Popup Script
 * Handles UI interactions and communication with background script
 */

// Import polyfill for Firefox compatibility
if (typeof browser === 'undefined' && typeof chrome !== 'undefined') {
  globalThis.browser = chrome;
}

// UI Elements
const elements = {
  // Sections
  setupSection: null,
  connectedSection: null,
  loadingSection: null,

  // Status
  statusDot: null,
  statusText: null,

  // Setup Form
  passphraseInput: null,
  rolePrimary: null,
  roleSecondary: null,
  connectBtn: null,

  // Connected View
  roleValue: null,
  lastSyncValue: null,
  bookmarksSynced: null,
  historySynced: null,
  syncCount: null,
  syncNowBtn: null,
  disconnectBtn: null,
  statusMessage: null,

  // Loading
  loadingText: null
};

// State
const state = {
  isConnected: false,
  isPrimary: false,
  connectionState: 'disconnected'
};

/**
 * Initialize popup
 */
async function initialize() {
  console.log('[Popup] Initializing...');

  // Cache DOM elements
  cacheElements();

  // Setup event listeners
  setupEventListeners();

  // Load current status
  await loadStatus();

  console.log('[Popup] Initialization complete');
}

/**
 * Cache DOM elements
 */
function cacheElements() {
  // Sections
  elements.setupSection = document.getElementById('setupSection');
  elements.connectedSection = document.getElementById('connectedSection');
  elements.loadingSection = document.getElementById('loadingSection');

  // Status
  elements.statusDot = document.getElementById('statusDot');
  elements.statusText = document.getElementById('statusText');

  // Setup Form
  elements.passphraseInput = document.getElementById('passphrase');
  elements.rolePrimary = document.getElementById('rolePrimary');
  elements.roleSecondary = document.getElementById('roleSecondary');
  elements.connectBtn = document.getElementById('connectBtn');

  // Connected View
  elements.roleValue = document.getElementById('roleValue');
  elements.lastSyncValue = document.getElementById('lastSyncValue');
  elements.bookmarksSynced = document.getElementById('bookmarksSynced');
  elements.historySynced = document.getElementById('historySynced');
  elements.syncCount = document.getElementById('syncCount');
  elements.syncNowBtn = document.getElementById('syncNowBtn');
  elements.disconnectBtn = document.getElementById('disconnectBtn');
  elements.statusMessage = document.getElementById('statusMessage');

  // Loading
  elements.loadingText = document.getElementById('loadingText');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Connect button
  elements.connectBtn.addEventListener('click', handleConnect);

  // Sync now button
  elements.syncNowBtn.addEventListener('click', handleSyncNow);

  // Disconnect button
  elements.disconnectBtn.addEventListener('click', handleDisconnect);

  // Enter key on passphrase input
  elements.passphraseInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  });

  // Listen for background messages
  browser.runtime.onMessage.addListener(handleBackgroundMessage);
}

/**
 * Load current status from background
 */
async function loadStatus() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'get-status' });

    if (response) {
      updateUIWithStatus(response);
    }
  } catch (error) {
    console.error('[Popup] Error loading status:', error);
  }
}

/**
 * Update UI based on status
 */
function updateUIWithStatus(status) {
  console.log('[Popup] Updating UI with status:', status);

  state.connectionState = status.connectionState;
  state.isPrimary = status.isPrimary;
  state.isConnected = status.connectionState === 'connected';

  // Update status indicator
  updateStatusIndicator(status.connectionState);

  // Update stats
  if (status.stats) {
    elements.bookmarksSynced.textContent = status.stats.totalBookmarksSynced || 0;
    elements.historySynced.textContent = status.stats.totalHistorySynced || 0;
    elements.syncCount.textContent = status.stats.syncCount || 0;
  }

  // Update last sync time
  if (status.lastSyncTime) {
    elements.lastSyncValue.textContent = formatTime(status.lastSyncTime);
  } else {
    elements.lastSyncValue.textContent = 'Never';
  }

  // Update role
  if (status.isPrimary !== undefined) {
    elements.roleValue.textContent = status.isPrimary ? 'Primary' : 'Secondary';
  }

  // Show appropriate section
  if (status.connectionState === 'connected') {
    showSection('connected');
  } else if (status.connectionState === 'connecting' || status.connectionState === 'waiting') {
    showSection('loading');
    elements.loadingText.textContent = status.connectionState === 'connecting'
      ? 'Connecting to peer...'
      : 'Waiting for peer...';
  } else {
    showSection('setup');
  }
}

/**
 * Update status indicator
 */
function updateStatusIndicator(state) {
  // Remove all status classes
  elements.statusDot.classList.remove('connected', 'connecting', 'error');

  // Update text and class
  switch (state) {
    case 'connected':
      elements.statusText.textContent = 'Connected';
      elements.statusDot.classList.add('connected');
      break;
    case 'connecting':
      elements.statusText.textContent = 'Connecting...';
      elements.statusDot.classList.add('connecting');
      break;
    case 'waiting':
      elements.statusText.textContent = 'Waiting for peer...';
      elements.statusDot.classList.add('connecting');
      break;
    case 'error':
      elements.statusText.textContent = 'Error';
      elements.statusDot.classList.add('error');
      break;
    default:
      elements.statusText.textContent = 'Disconnected';
  }
}

/**
 * Show specific section
 */
function showSection(section) {
  elements.setupSection.classList.add('hidden');
  elements.connectedSection.classList.add('hidden');
  elements.loadingSection.classList.add('hidden');

  switch (section) {
    case 'setup':
      elements.setupSection.classList.remove('hidden');
      break;
    case 'connected':
      elements.connectedSection.classList.remove('hidden');
      break;
    case 'loading':
      elements.loadingSection.classList.remove('hidden');
      break;
  }
}

/**
 * Handle connect button click
 */
async function handleConnect() {
  const passphrase = elements.passphraseInput.value.trim();

  if (!passphrase) {
    showStatusMessage('Please enter a passphrase', 'error');
    return;
  }

  if (passphrase.length < 8) {
    showStatusMessage('Passphrase must be at least 8 characters', 'error');
    return;
  }

  const isPrimary = elements.rolePrimary.checked;

  try {
    // Show loading
    showSection('loading');
    elements.loadingText.textContent = isPrimary
      ? 'Starting as Primary...'
      : 'Connecting to Primary...';

    // Disable button
    elements.connectBtn.disabled = true;

    // Send message to background
    const response = await browser.runtime.sendMessage({
      type: 'start-connection',
      passphrase: passphrase,
      isPrimary: isPrimary
    });

    if (response.success) {
      console.log('[Popup] Connection initiated successfully');
      elements.loadingText.textContent = isPrimary
        ? 'Waiting for secondary device...'
        : 'Connecting...';
    } else {
      throw new Error(response.error || 'Failed to start connection');
    }
  } catch (error) {
    console.error('[Popup] Connection error:', error);
    showSection('setup');
    showStatusMessage('Connection failed: ' + error.message, 'error');
    elements.connectBtn.disabled = false;
  }
}

/**
 * Handle sync now button click
 */
async function handleSyncNow() {
  try {
    elements.syncNowBtn.disabled = true;
    elements.syncNowBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="spinner">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>
      </svg>
      Syncing...
    `;

    showStatusMessage('Initiating sync...', 'warning');

    const response = await browser.runtime.sendMessage({
      type: 'sync-now'
    });

    if (response.success) {
      showStatusMessage('Sync initiated successfully!', 'success');

      // Reload status after a delay
      setTimeout(async () => {
        await loadStatus();
      }, 2000);
    } else {
      throw new Error(response.error || 'Sync failed');
    }
  } catch (error) {
    console.error('[Popup] Sync error:', error);
    showStatusMessage('Sync failed: ' + error.message, 'error');
  } finally {
    elements.syncNowBtn.disabled = false;
    elements.syncNowBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M14 8a6 6 0 11-12 0 6 6 0 0112 0z" stroke="currentColor" stroke-width="1.5"/>
        <path d="M8 4v4l2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      Sync Now
    `;
  }
}

/**
 * Handle disconnect button click
 */
async function handleDisconnect() {
  try {
    elements.disconnectBtn.disabled = true;

    const response = await browser.runtime.sendMessage({
      type: 'disconnect'
    });

    if (response.success) {
      showSection('setup');
      elements.passphraseInput.value = '';
      showStatusMessage('Disconnected successfully', 'success');
    }
  } catch (error) {
    console.error('[Popup] Disconnect error:', error);
    showStatusMessage('Disconnect failed: ' + error.message, 'error');
  } finally {
    elements.disconnectBtn.disabled = false;
  }
}

/**
 * Handle messages from background script
 */
function handleBackgroundMessage(message) {
  console.log('[Popup] Received message:', message.type);

  switch (message.type) {
    case 'connection-state':
    case 'connection-state-change':
      handleConnectionStateChange(message);
      break;
  }
}

/**
 * Handle connection state change
 */
function handleConnectionStateChange(message) {
  console.log('[Popup] Connection state changed:', message.state);

  state.connectionState = message.state;
  updateStatusIndicator(message.state);

  if (message.message) {
    showStatusMessage(message.message, message.state === 'error' ? 'error' : 'success');
  }

  // Update UI based on new state
  if (message.state === 'connected') {
    showSection('connected');
    loadStatus();
  } else if (message.state === 'connecting' || message.state === 'waiting') {
    showSection('loading');
    elements.loadingText.textContent = message.state === 'connecting'
      ? 'Connecting to peer...'
      : 'Waiting for peer...';
  } else if (message.state === 'disconnected' || message.state === 'error') {
    showSection('setup');
    elements.connectBtn.disabled = false;
  }
}

/**
 * Show status message
 */
function showStatusMessage(message, type = 'success') {
  if (!elements.statusMessage) return;

  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.remove('hidden', 'error', 'warning', 'success');
  elements.statusMessage.classList.add(type);

  // Auto-hide after 5 seconds
  setTimeout(() => {
    elements.statusMessage.classList.add('hidden');
  }, 5000);
}

/**
 * Format timestamp to relative time
 */
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Format number with comma separators
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

console.log('[Popup] Script loaded');
