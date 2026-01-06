/**
 * SynchroPeer - Background Service Worker / Script
 * Main orchestrator for P2P synchronization
 */

// Import polyfill for Firefox compatibility
if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  globalThis.browser = chrome;
}

// PeerJS is loaded via background.html
let Peer = window.Peer;

// Global state
const state = {
  isInitialized: false,
  isPrimary: false,
  passphrase: null,
  peer: null,
  connection: null,
  connectionState: "disconnected",
  lastSyncTime: 0,
  syncInProgress: false,
  stats: {
    totalBookmarksSynced: 0,
    totalHistorySynced: 0,
    lastSyncDuration: 0,
    syncCount: 0,
  },
};

// Message handlers
const messageHandlers = new Map();

/**
 * Initialize the extension
 */
async function initialize() {
  console.log("[Background] SynchroPeer initializing...");

  // Check if PeerJS is available
  if (!Peer) {
    console.error("[Background] PeerJS not loaded!");
    return;
  }
  console.log("[Background] PeerJS available:", typeof Peer);

  // Load saved configuration
  const config = await browser.storage.local.get([
    "passphrase",
    "isPrimary",
    "lastSyncTime",
    "stats",
  ]);

  if (config.passphrase) {
    state.passphrase = config.passphrase;
    state.isPrimary = config.isPrimary || false;
    state.lastSyncTime = config.lastSyncTime || 0;
    state.stats = config.stats || state.stats;
  }

  state.isInitialized = true;
  console.log("[Background] Initialization complete");
}

/**
 * Generate deterministic peer ID from passphrase
 */
async function generatePeerID(passphrase, isPrimary) {
  const encoder = new TextEncoder();
  const suffix = isPrimary ? "-primary" : "-secondary";
  const data = encoder.encode(passphrase + suffix);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "sp-" + hashHex.substring(0, 28);
}

/**
 * Start P2P connection
 */
async function startP2PConnection(passphrase, isPrimary) {
  try {
    console.log(
      `[Background] Starting P2P as ${isPrimary ? "PRIMARY" : "SECONDARY"}`,
    );

    state.passphrase = passphrase;
    state.isPrimary = isPrimary;

    // Save configuration
    await browser.storage.local.set({
      passphrase: passphrase,
      isPrimary: isPrimary,
    });

    // Generate peer ID
    const peerId = await generatePeerID(passphrase, isPrimary);
    console.log("[Background] Peer ID:", peerId);

    // Initialize PeerJS
    const peerConfig = {
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      debug: 2,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    };

    state.peer = new Peer(peerId, peerConfig);
    setupPeerEvents();

    // If secondary, connect to primary after peer is open
    if (!isPrimary) {
      state.peer.on("open", async () => {
        const primaryPeerId = await generatePeerID(passphrase, true);
        await connectToPeer(primaryPeerId);
      });
    }

    return { success: true, peerId };
  } catch (error) {
    console.error("[Background] Error starting P2P:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Setup PeerJS event handlers
 */
function setupPeerEvents() {
  state.peer.on("open", (id) => {
    console.log("[Background] Peer opened:", id);
    state.connectionState = "waiting";
    notifyConnectionState("waiting");
  });

  state.peer.on("connection", (conn) => {
    console.log("[Background] Incoming connection from:", conn.peer);
    setupDataConnection(conn);
  });

  state.peer.on("error", (error) => {
    console.error("[Background] Peer error:", error);
    handlePeerError(error);
  });

  state.peer.on("disconnected", () => {
    console.log("[Background] Peer disconnected, attempting reconnect...");
    // Attempt to reconnect
    setTimeout(() => {
      if (state.peer && !state.peer.destroyed) {
        state.peer.reconnect();
      }
    }, 5000);
  });

  state.peer.on("close", () => {
    console.log("[Background] Peer closed");
    state.connectionState = "disconnected";
    notifyConnectionState("disconnected");
  });

  return { success: true };
}

/**
 * Connect to a peer
 */
function connectToPeer(peerId) {
  return new Promise((resolve, reject) => {
    console.log("[Background] Connecting to peer:", peerId);
    state.connectionState = "connecting";
    notifyConnectionState("connecting");

    const conn = state.peer.connect(peerId, {
      reliable: true,
      serialization: "json",
    });

    setupDataConnection(conn);

    const timeout = setTimeout(() => {
      if (state.connectionState !== "connected") {
        reject(new Error("Connection timeout"));
      }
    }, 30000);

    conn.on("open", () => {
      clearTimeout(timeout);
      resolve();
    });

    conn.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Handle peer errors intelligently
 */
function handlePeerError(error) {
  // Don't immediately abort on every error
  const recoverableErrors = ["peer-unavailable", "network", "disconnected"];

  if (error.type && recoverableErrors.includes(error.type)) {
    console.log("[Background] Recoverable error, keeping connection alive");
    state.connectionState = "waiting";
    notifyConnectionState("waiting", "Retrying...");
    return;
  }

  // Only abort on fatal errors
  state.connectionState = "error";
  notifyConnectionState("error", error.message || error.toString());
}

/**
 * Setup data connection event handlers
 */
function setupDataConnection(conn) {
  state.connection = conn;

  conn.on("open", () => {
    console.log("[Background] Data channel opened");
    state.connectionState = "connected";
    notifyConnectionState("connected");

    // Send handshake
    sendMessage({
      type: "handshake",
      timestamp: Date.now(),
      version: "1.0.0",
    });
  });

  conn.on("data", (data) => {
    console.log("[Background] Received:", data.type);
    handleIncomingMessage(data);
  });

  conn.on("close", () => {
    console.log("[Background] Connection closed");
    state.connectionState = "disconnected";
    notifyConnectionState("disconnected");
  });

  conn.on("error", (error) => {
    console.error("[Background] Connection error:", error);
    state.connectionState = "error";
    notifyConnectionState("error", error.message);
  });
}

/**
 * Handle incoming messages
 */
async function handleIncomingMessage(message) {
  switch (message.type) {
    case "handshake":
      console.log("[Background] Received handshake");
      await handleHandshake(message);
      break;

    case "sync-request":
      console.log("[Background] Received sync request");
      await handleSyncRequest(message);
      break;

    case "sync-response":
      console.log("[Background] Received sync response");
      await handleSyncResponse(message);
      break;

    case "snapshot":
      console.log("[Background] Received snapshot");
      await handleSnapshot(message);
      break;

    case "sync-complete":
      console.log("[Background] Sync complete");
      state.syncInProgress = false;
      notifyConnectionState("connected", "Sync completed");
      break;

    default:
      console.warn("[Background] Unknown message type:", message.type);
  }
}

/**
 * Handle handshake
 */
async function handleHandshake(message) {
  // Respond with handshake acknowledgment
  sendMessage({
    type: "handshake-ack",
    timestamp: Date.now(),
  });
}

/**
 * Handle sync request from peer
 */
async function handleSyncRequest(message) {
  try {
    state.syncInProgress = true;
    notifyConnectionState("connected", "Creating snapshot...");

    // Create snapshot
    const snapshot = await createSnapshot();

    // Encrypt snapshot
    const encryptedSnapshot = await encryptData(snapshot, state.passphrase);

    // Send snapshot
    sendMessage({
      type: "snapshot",
      data: encryptedSnapshot,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Background] Error handling sync request:", error);
    sendMessage({
      type: "error",
      message: error.message,
    });
  }
}

/**
 * Handle sync response from peer
 */
async function handleSyncResponse(message) {
  // Placeholder for handling sync response
}

/**
 * Handle snapshot from peer
 */
async function handleSnapshot(message) {
  try {
    notifyConnectionState("connected", "Applying sync...");

    // Decrypt snapshot
    const snapshot = await decryptData(message.data, state.passphrase);

    // Apply snapshot
    const results = await applySnapshot(snapshot);

    console.log("[Background] Sync results:", results);

    // Update stats
    state.stats.totalBookmarksSynced += results.bookmarksAdded;
    state.stats.totalHistorySynced += results.historyAdded;
    state.stats.syncCount++;
    state.lastSyncTime = Date.now();

    await browser.storage.local.set({
      lastSyncTime: state.lastSyncTime,
      stats: state.stats,
    });

    // Send completion message
    sendMessage({
      type: "sync-complete",
      results: results,
      timestamp: Date.now(),
    });

    state.syncInProgress = false;
    notifyConnectionState("connected", "Sync completed successfully");
  } catch (error) {
    console.error("[Background] Error handling snapshot:", error);
    state.syncInProgress = false;
    notifyConnectionState("error", "Sync failed: " + error.message);
  }
}

/**
 * Send message to peer
 */
function sendMessage(message) {
  if (!state.connection || state.connectionState !== "connected") {
    console.warn("[Background] Not connected, cannot send message");
    return;
  }

  try {
    state.connection.send(message);
  } catch (error) {
    console.error("[Background] Error sending message:", error);
  }
}

/**
 * Initiate sync
 */
async function initiateSync() {
  if (state.syncInProgress) {
    console.log("[Background] Sync already in progress");
    return { success: false, error: "Sync already in progress" };
  }

  if (state.connectionState !== "connected") {
    return { success: false, error: "Not connected to peer" };
  }

  try {
    state.syncInProgress = true;
    const startTime = Date.now();

    notifyConnectionState("connected", "Starting sync...");

    // Create snapshot
    notifyConnectionState("connected", "Creating snapshot...");
    const localSnapshot = await createSnapshot();

    // Encrypt snapshot
    notifyConnectionState("connected", "Encrypting data...");
    const encryptedSnapshot = await encryptData(
      localSnapshot,
      state.passphrase,
    );

    // Request peer snapshot
    sendMessage({
      type: "sync-request",
      timestamp: Date.now(),
    });

    // Also send our snapshot
    sendMessage({
      type: "snapshot",
      data: encryptedSnapshot,
      timestamp: Date.now(),
    });

    state.stats.lastSyncDuration = Date.now() - startTime;

    return { success: true };
  } catch (error) {
    console.error("[Background] Error initiating sync:", error);
    state.syncInProgress = false;
    return { success: false, error: error.message };
  }
}

/**
 * Create snapshot of bookmarks and history
 */
async function createSnapshot() {
  const [bookmarks, history] = await Promise.all([
    extractBookmarks(),
    extractHistory(),
  ]);

  return {
    timestamp: Date.now(),
    bookmarks: bookmarks,
    history: history,
    bookmarkCount: bookmarks.length,
    historyCount: history.length,
  };
}

/**
 * Extract all bookmarks
 */
async function extractBookmarks() {
  try {
    const bookmarkTree = await browser.bookmarks.getTree();
    const flatBookmarks = [];

    const traverse = (nodes, path = []) => {
      for (const node of nodes) {
        const bookmark = {
          id: node.id,
          parentId: node.parentId,
          index: node.index,
          title: node.title || "",
          url: node.url || null,
          dateAdded: node.dateAdded || Date.now(),
          type: node.url ? "bookmark" : "folder",
          path: [...path, node.title || "root"],
        };

        flatBookmarks.push(bookmark);

        if (node.children) {
          traverse(node.children, bookmark.path);
        }
      }
    };

    traverse(bookmarkTree);
    return flatBookmarks;
  } catch (error) {
    console.error("[Background] Error extracting bookmarks:", error);
    return [];
  }
}

/**
 * Extract browsing history
 */
async function extractHistory(maxItems = 5000) {
  try {
    const historyItems = await browser.history.search({
      text: "",
      maxResults: maxItems,
      startTime: 0,
    });

    return historyItems.map((item) => ({
      url: item.url,
      title: item.title || "",
      visitCount: item.visitCount || 0,
      lastVisitTime: item.lastVisitTime || Date.now(),
    }));
  } catch (error) {
    console.error("[Background] Error extracting history:", error);
    return [];
  }
}

/**
 * Apply snapshot (merge with local data)
 */
async function applySnapshot(remoteSnapshot) {
  const results = {
    bookmarksAdded: 0,
    historyAdded: 0,
    errors: [],
  };

  // Get local snapshot for comparison
  const localSnapshot = await createSnapshot();

  // Create lookup maps
  const localBookmarkMap = new Map();
  for (const bookmark of localSnapshot.bookmarks) {
    const key = bookmark.url
      ? `url:${bookmark.url}`
      : `folder:${bookmark.path.join("/")}`;
    localBookmarkMap.set(key, bookmark);
  }

  const localHistoryMap = new Map(localSnapshot.history.map((h) => [h.url, h]));

  // Apply bookmarks
  for (const remoteBookmark of remoteSnapshot.bookmarks) {
    const key = remoteBookmark.url
      ? `url:${remoteBookmark.url}`
      : `folder:${remoteBookmark.path.join("/")}`;
    const localBookmark = localBookmarkMap.get(key);

    if (!localBookmark && remoteBookmark.url) {
      try {
        await addBookmark(remoteBookmark);
        results.bookmarksAdded++;
      } catch (error) {
        console.error("[Background] Error adding bookmark:", error);
        results.errors.push({ type: "bookmark", error: error.message });
      }
    }
  }

  // Apply history
  for (const remoteHistory of remoteSnapshot.history) {
    const localHistory = localHistoryMap.get(remoteHistory.url);

    if (
      !localHistory ||
      remoteHistory.lastVisitTime > localHistory.lastVisitTime
    ) {
      try {
        await addHistoryItem(remoteHistory);
        results.historyAdded++;
      } catch (error) {
        console.error("[Background] Error adding history:", error);
        results.errors.push({ type: "history", error: error.message });
      }
    }
  }

  return results;
}

/**
 * Add bookmark to browser
 */
async function addBookmark(bookmark) {
  try {
    // Find or create parent folder
    const parentId = await findOrCreateParentFolder(bookmark.path.slice(0, -1));

    // Check if bookmark already exists
    const existing = await browser.bookmarks.search({ url: bookmark.url });
    if (existing.length === 0) {
      await browser.bookmarks.create({
        parentId: parentId,
        title: bookmark.title,
        url: bookmark.url,
      });
    }
  } catch (error) {
    console.error("[Background] Error in addBookmark:", error);
    throw error;
  }
}

/**
 * Find or create parent folder
 */
async function findOrCreateParentFolder(path) {
  try {
    let currentParentId = "1"; // Default bookmarks folder

    for (let i = 1; i < path.length; i++) {
      const folderName = path[i];
      const children = await browser.bookmarks.getChildren(currentParentId);

      let found = children.find(
        (child) => !child.url && child.title === folderName,
      );

      if (!found) {
        found = await browser.bookmarks.create({
          parentId: currentParentId,
          title: folderName,
        });
      }

      currentParentId = found.id;
    }

    return currentParentId;
  } catch (error) {
    console.error("[Background] Error in findOrCreateParentFolder:", error);
    return "1";
  }
}

/**
 * Add history item to browser
 */
async function addHistoryItem(historyItem) {
  try {
    if (!historyItem.url || !historyItem.url.startsWith("http")) {
      return;
    }

    await browser.history.addUrl({
      url: historyItem.url,
      title: historyItem.title,
      visitTime: historyItem.lastVisitTime,
    });
  } catch (error) {
    console.error("[Background] Error in addHistoryItem:", error);
    throw error;
  }
}

/**
 * Encrypt data using AES-256-GCM
 */
async function encryptData(data, passphrase) {
  const algorithm = "AES-GCM";
  const saltLength = 16;
  const ivLength = 12;
  const iterations = 100000;

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(saltLength));
  const iv = crypto.getRandomValues(new Uint8Array(ivLength));

  // Derive key
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: algorithm, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  // Encrypt
  const dataString = JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: algorithm, iv: iv },
    key,
    dataBuffer,
  );

  // Combine salt + iv + encrypted data
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(
    salt.length + iv.length + encryptedArray.length,
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(encryptedArray, salt.length + iv.length);

  // Convert to base64
  return arrayBufferToBase64(combined);
}

/**
 * Decrypt data using AES-256-GCM
 */
async function decryptData(encryptedData, passphrase) {
  const algorithm = "AES-GCM";
  const saltLength = 16;
  const ivLength = 12;
  const iterations = 100000;

  // Convert from base64
  const combined = base64ToArrayBuffer(encryptedData);

  // Extract salt, iv, and encrypted data
  const salt = combined.slice(0, saltLength);
  const iv = combined.slice(saltLength, saltLength + ivLength);
  const encrypted = combined.slice(saltLength + ivLength);

  // Derive key
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: algorithm, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: algorithm, iv: iv },
    key,
    encrypted,
  );

  // Parse JSON
  const decoder = new TextDecoder();
  const decryptedString = decoder.decode(decryptedBuffer);
  return JSON.parse(decryptedString);
}

/**
 * Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 to Uint8Array
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Notify connection state change
 */
function notifyConnectionState(state, message = "") {
  // Update badge
  updateBadge(state);

  // Send to popup if open
  browser.runtime
    .sendMessage({
      type: "connection-state",
      state: state,
      message: message,
      timestamp: Date.now(),
    })
    .catch(() => {
      // Ignore if popup is not open
    });
}

/**
 * Update extension badge
 */
function updateBadge(state) {
  const badges = {
    disconnected: { text: "", color: "#888888" },
    connecting: { text: "...", color: "#FFA500" },
    waiting: { text: "⏳", color: "#FFA500" },
    connected: { text: "✓", color: "#00AA00" },
    error: { text: "!", color: "#FF0000" },
  };

  const badge = badges[state] || badges.disconnected;

  // Firefox Manifest V2 uses browserAction instead of action
  const badgeAPI = browser.browserAction || browser.action;

  badgeAPI.setBadgeText({ text: badge.text });
  badgeAPI.setBadgeBackgroundColor({ color: badge.color });
}

/**
 * Disconnect from peer
 */
function disconnect() {
  if (state.connection) {
    state.connection.close();
    state.connection = null;
  }

  if (state.peer) {
    state.peer.destroy();
    state.peer = null;
  }

  state.connectionState = "disconnected";
  state.syncInProgress = false;
  notifyConnectionState("disconnected");
}

/**
 * Get current status
 */
function getStatus() {
  return {
    isInitialized: state.isInitialized,
    connectionState: state.connectionState,
    isPrimary: state.isPrimary,
    lastSyncTime: state.lastSyncTime,
    syncInProgress: state.syncInProgress,
    stats: state.stats,
  };
}

// Message listener for popup communication
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message.type);

  (async () => {
    try {
      switch (message.type) {
        case "start-connection":
          const result = await startP2PConnection(
            message.passphrase,
            message.isPrimary,
          );
          sendResponse(result);
          break;

        case "disconnect":
          disconnect();
          sendResponse({ success: true });
          break;

        case "sync-now":
          const syncResult = await initiateSync();
          sendResponse(syncResult);
          break;

        case "get-status":
          sendResponse(getStatus());
          break;

        default:
          sendResponse({ success: false, error: "Unknown message type" });
      }
    } catch (error) {
      console.error("[Background] Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Keep channel open for async response
});

// Initialize on startup
initialize();

console.log("[Background] SynchroPeer background script loaded");
