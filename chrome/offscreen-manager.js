/**
 * SynchroPeer - Offscreen Document Manager
 * Manages the lifecycle of the offscreen document for WebRTC operations
 */

let offscreenDocumentCreated = false;

/**
 * Ensure the offscreen document exists
 */
async function ensureOffscreenDocument() {
  // Check if document already exists
  if (await hasOffscreenDocument()) {
    console.log("[OffscreenManager] Offscreen document already exists");
    return;
  }

  // Create offscreen document
  console.log("[OffscreenManager] Creating offscreen document...");

  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
      justification: 'Needed to access WebRTC APIs (RTCPeerConnection) which are not available in service worker context'
    });

    offscreenDocumentCreated = true;
    console.log("[OffscreenManager] Offscreen document created successfully");
  } catch (error) {
    console.error("[OffscreenManager] Failed to create offscreen document:", error);
    throw error;
  }
}

/**
 * Check if offscreen document exists
 */
async function hasOffscreenDocument() {
  // In Chrome, we can check if any offscreen documents exist
  if ('offscreen' in chrome && chrome.offscreen) {
    try {
      const contexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
      });
      return contexts.length > 0;
    } catch (error) {
      console.warn("[OffscreenManager] Could not check for offscreen document:", error);
      return offscreenDocumentCreated;
    }
  }
  return false;
}

/**
 * Close the offscreen document
 */
async function closeOffscreenDocument() {
  if (!await hasOffscreenDocument()) {
    console.log("[OffscreenManager] No offscreen document to close");
    return;
  }

  console.log("[OffscreenManager] Closing offscreen document...");

  try {
    await chrome.offscreen.closeDocument();
    offscreenDocumentCreated = false;
    console.log("[OffscreenManager] Offscreen document closed");
  } catch (error) {
    console.error("[OffscreenManager] Failed to close offscreen document:", error);
    throw error;
  }
}

/**
 * Send a message to the offscreen document
 */
async function sendToOffscreen(message) {
  await ensureOffscreenDocument();

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

/**
 * Initialize peer in offscreen document
 */
async function initPeer(peerId, config, isPrimary, passphrase) {
  console.log("[OffscreenManager] Initializing peer:", peerId);

  return await sendToOffscreen({
    type: 'PEER_INIT',
    data: { peerId, config, isPrimary, passphrase }
  });
}

/**
 * Connect to peer in offscreen document
 */
async function connectToPeer(targetPeerId) {
  console.log("[OffscreenManager] Connecting to peer:", targetPeerId);

  return await sendToOffscreen({
    type: 'PEER_CONNECT',
    data: { targetPeerId }
  });
}

/**
 * Send data through peer connection in offscreen document
 */
async function sendPeerData(message) {
  console.log("[OffscreenManager] Sending peer data:", message.type || 'unknown');

  return await sendToOffscreen({
    type: 'PEER_SEND',
    data: { message }
  });
}

/**
 * Disconnect peer in offscreen document
 */
async function disconnectPeer() {
  console.log("[OffscreenManager] Disconnecting peer");

  try {
    return await sendToOffscreen({
      type: 'PEER_DISCONNECT',
      data: {}
    });
  } catch (error) {
    console.warn("[OffscreenManager] Error disconnecting peer:", error);
  }
}

/**
 * Get peer status from offscreen document
 */
async function getPeerStatus() {
  return await sendToOffscreen({
    type: 'PEER_STATUS',
    data: {}
  });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ensureOffscreenDocument,
    hasOffscreenDocument,
    closeOffscreenDocument,
    sendToOffscreen,
    initPeer,
    connectToPeer,
    sendPeerData,
    disconnectPeer,
    getPeerStatus
  };
}
