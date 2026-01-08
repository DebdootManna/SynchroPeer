/**
 * SynchroPeer - Background Service Worker
 * Main orchestrator for P2P synchronization
 * Delegates WebRTC operations to offscreen document
 */

// Import polyfill for Firefox compatibility
if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  globalThis.browser = chrome;
}

// Import offscreen manager
importScripts("offscreen-manager.js");

console.log("[Background] Service worker starting...");
console.log(
  "[Background] Offscreen API available:",
  typeof chrome.offscreen !== "undefined",
);

// Check if offscreen API is actually available
if (typeof chrome.offscreen === "undefined") {
  console.error("[Background] CRITICAL: Offscreen API not available!");
  console.error(
    "[Background] This browser may not support offscreen documents.",
  );
  console.error("[Background] WebRTC operations will fail.");
} else {
  console.log("[Background] Offscreen API check:", {
    hasOffscreen: "offscreen" in chrome,
    hasCreateDocument: typeof chrome.offscreen?.createDocument === "function",
    hasCloseDocument: typeof chrome.offscreen?.closeDocument === "function",
  });
}

// Global state
const state = {
  isInitialized: false,
  isPrimary: false,
  passphrase: null,
  peerId: null,
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
async function initialize(passphrase, isPrimary) {
  console.log("[Background] Initializing SynchroPeer...");
  console.log("[Background] Mode:", isPrimary ? "Primary" : "Secondary");

  try {
    state.passphrase = passphrase;
    state.isPrimary = isPrimary;
    state.isInitialized = true;

    // Generate peer ID from passphrase
    const peerId = await generatePeerID(passphrase);
    state.peerId = peerId;

    console.log("[Background] Generated peer ID:", peerId);
    console.log(
      "[Background] Peer ID (first 8 chars):",
      peerId.substring(0, 8),
    );

    return { success: true, peerId };
  } catch (error) {
    console.error("[Background] Initialization failed:", error);
    throw error;
  }
}

/**
 * Generate a deterministic peer ID from passphrase
 */
async function generatePeerID(passphrase, isPrimary = null) {
  const encoder = new TextEncoder();
  // Use provided isPrimary or fall back to state
  const primary = isPrimary !== null ? isPrimary : state.isPrimary;
  const suffix = primary ? "-primary" : "-secondary";
  const data = encoder.encode(passphrase + suffix);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sp-${hashHex.substring(0, 32)}`;
}

/**
 * Start P2P connection
 */
async function startP2PConnection() {
  console.log("[Background] Starting P2P connection...");

  if (!state.isInitialized) {
    throw new Error("Not initialized");
  }

  try {
    const config = {
      host: "0.peerjs.com",
      port: 443,
      path: "/",
      secure: true,
      debug: 2,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
        ],
      },
    };

    // Initialize peer in offscreen document
    console.log("[Background] Initializing peer in offscreen document...");
    console.log("[Background] Using peer ID:", state.peerId);

    try {
      const result = await initPeer(
        state.peerId,
        config,
        state.isPrimary,
        state.passphrase,
      );
      console.log("[Background] Peer initialization result:", result);
    } catch (error) {
      console.error("[Background] Failed to initialize peer:", error);
      throw error;
    }

    if (state.isPrimary) {
      console.log("[Background] Primary peer opened, waiting for secondary...");
      state.connectionState = "waiting";
      notifyConnectionState("waiting", "Waiting for secondary device...");
    } else {
      console.log(
        "[Background] Secondary peer opened, connecting to primary...",
      );
      state.connectionState = "connecting";
      notifyConnectionState("connecting", "Connecting to primary device...");

      // Connect to primary - generate primary peer ID
      const primaryPeerId = await generatePeerID(state.passphrase, true);
      console.log("[Background] Primary peer ID to connect to:", primaryPeerId);
      console.log(
        "[Background] Primary peer ID (first 8):",
        primaryPeerId.substring(0, 8),
      );
      await connectToPeer(primaryPeerId);
    }

    return { success: true };
  } catch (error) {
    console.error("[Background] Failed to start P2P connection:", error);
    state.connectionState = "error";
    notifyConnectionState("error", error.message);
    throw error;
  }
}

/**
 * Handle incoming messages from offscreen document
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Received message:", message.type);

  // Messages from offscreen document (peer events)
  if (
    message.type?.startsWith("PEER_") ||
    message.type?.startsWith("CONNECTION_")
  ) {
    handleOffscreenMessage(message);
    return false;
  }

  // Messages from popup
  const handler = messageHandlers.get(message.action);
  if (handler) {
    handler(message.data)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  console.warn("[Background] Unknown message action:", message.action);
  sendResponse({ success: false, error: "Unknown action" });
  return false;
});

/**
 * Handle messages from offscreen document
 */
function handleOffscreenMessage(message) {
  console.log("[Background] Offscreen event:", message.type);

  switch (message.type) {
    case "PEER_OPENED":
      console.log("[Background] Peer opened with ID:", message.data.id);
      break;

    case "PEER_INCOMING_CONNECTION":
      console.log("[Background] Incoming connection from:", message.data.peer);
      break;

    case "CONNECTION_OPENED":
      console.log("[Background] Data connection established!");
      state.connectionState = "connected";
      notifyConnectionState("connected", "Connected to peer");

      // Send handshake
      sendPeerData({
        type: "handshake",
        timestamp: Date.now(),
        version: "1.0",
      }).catch((error) =>
        console.error("[Background] Failed to send handshake:", error),
      );
      break;

    case "CONNECTION_DATA":
      handleIncomingMessage(message.data).catch((error) => {
        console.error("[Background] Failed to handle incoming message:", error);
      });
      break;

    case "CONNECTION_CLOSED":
      console.log("[Background] Connection closed");
      state.connectionState = "disconnected";
      notifyConnectionState("disconnected", "Connection closed");
      break;

    case "CONNECTION_ERROR":
      console.error("[Background] Connection error:", message.data.error);
      state.connectionState = "error";
      notifyConnectionState("error", message.data.error);
      break;

    case "PEER_DISCONNECTED":
      console.log("[Background] Peer disconnected from signaling server");
      state.connectionState = "disconnected";
      notifyConnectionState("disconnected", "Disconnected from server");
      break;

    case "PEER_ERROR":
      console.error("[Background] Peer error:", message.data.error);
      state.connectionState = "error";
      notifyConnectionState("error", message.data.error);
      break;
  }
}

/**
 * Handle incoming messages from peer
 */
async function handleIncomingMessage(message) {
  console.log("[Background] Handling message type:", message.type);

  switch (message.type) {
    case "handshake":
      await handleHandshake(message);
      break;
    case "sync_request":
      await handleSyncRequest(message);
      break;
    case "sync_response":
      await handleSyncResponse(message);
      break;
    case "snapshot":
      await handleSnapshot(message);
      break;
    default:
      console.warn("[Background] Unknown message type:", message.type);
  }
}

/**
 * Handle handshake message
 */
async function handleHandshake(message) {
  console.log("[Background] Received handshake from peer");

  // Send handshake response
  await sendPeerData({
    type: "handshake",
    timestamp: Date.now(),
  });
}

/**
 * Handle sync request
 */
async function handleSyncRequest(message) {
  console.log("[Background] Received sync request");

  try {
    const snapshot = await createSnapshot();
    const encryptedSnapshot = await encryptData(snapshot, state.passphrase);

    await sendPeerData({
      type: "sync_response",
      data: encryptedSnapshot,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Background] Failed to handle sync request:", error);
    await sendPeerData({
      type: "error",
      message: error.message,
    });
  }
}

/**
 * Handle sync response
 */
async function handleSyncResponse(message) {
  console.log("[Background] Received sync response");
  // Process in handleSnapshot
  await handleSnapshot(message);
}

/**
 * Handle snapshot data
 */
async function handleSnapshot(message) {
  console.log("[Background] Processing snapshot...");

  try {
    const snapshot = await decryptData(message.data, state.passphrase);
    const results = await applySnapshot(snapshot);

    state.lastSyncTime = Date.now();
    state.stats = results;

    console.log("[Background] Snapshot applied successfully:", results);

    await sendPeerData({
      type: "sync_complete",
      results,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("[Background] Failed to apply snapshot:", error);
    throw error;
  }
}

/**
 * Initiate sync
 */
async function initiateSync() {
  if (!state.isInitialized) {
    throw new Error("Not initialized");
  }

  if (state.connectionState !== "connected") {
    throw new Error("Not connected to peer");
  }

  if (state.syncInProgress) {
    throw new Error("Sync already in progress");
  }

  console.log("[Background] Initiating sync...");
  state.syncInProgress = true;

  try {
    const startTime = Date.now();

    if (state.isPrimary) {
      // Primary: send request and wait for response
      await sendPeerData({
        type: "sync_request",
        timestamp: Date.now(),
      });
    } else {
      // Secondary: create and send snapshot
      const localSnapshot = await createSnapshot();
      const encryptedSnapshot = await encryptData(
        localSnapshot,
        state.passphrase,
      );

      await sendPeerData({
        type: "snapshot",
        data: encryptedSnapshot,
        timestamp: Date.now(),
      });
    }

    console.log("[Background] Sync initiated in", Date.now() - startTime, "ms");
    return { success: true };
  } catch (error) {
    console.error("[Background] Sync failed:", error);
    throw error;
  } finally {
    state.syncInProgress = false;
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
    bookmarks,
    history,
    bookmarkCount: bookmarks.length,
    historyCount: history.length,
  };
}

/**
 * Extract bookmarks
 */
async function extractBookmarks() {
  console.log("[Background] Extracting bookmarks...");
  const bookmarkTree = await chrome.bookmarks.getTree();
  const flatBookmarks = [];

  const traverse = (nodes, path = []) => {
    for (const node of nodes) {
      const bookmark = {
        id: node.id,
        parentId: node.parentId,
        index: node.index,
        title: node.title || "",
        url: node.url || "",
        dateAdded: node.dateAdded || Date.now(),
        type: node.url ? "bookmark" : "folder",
        path: [...path, node.title || ""].join("/"),
      };

      if (bookmark.url || bookmark.type === "folder") {
        flatBookmarks.push(bookmark);
      }

      if (node.children) {
        traverse(node.children, [...path, node.title || ""]);
      }
    }
  };

  traverse(bookmarkTree);
  console.log("[Background] Extracted", flatBookmarks.length, "bookmarks");
  return flatBookmarks;
}

/**
 * Extract history
 */
async function extractHistory(maxResults = 1000) {
  console.log("[Background] Extracting history...");

  const historyItems = await chrome.history.search({
    text: "",
    maxResults,
    startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
  });

  const history = historyItems.map((item) => ({
    url: item.url,
    title: item.title || "",
    visitCount: item.visitCount || 1,
    lastVisitTime: item.lastVisitTime || Date.now(),
  }));

  console.log("[Background] Extracted", history.length, "history items");
  return history;
}

/**
 * Apply snapshot to local browser
 */
async function applySnapshot(snapshot) {
  const results = {
    bookmarksAdded: 0,
    historyAdded: 0,
    errors: [],
  };

  // Create maps for quick lookup
  const localSnapshot = await createSnapshot();

  const localBookmarkMap = new Map();
  for (const bookmark of localSnapshot.bookmarks) {
    const key = `${bookmark.url}|${bookmark.title}`;
    localBookmarkMap.set(key, bookmark);
  }

  const localHistoryMap = new Map();
  for (const historyItem of localSnapshot.history) {
    const key = `${historyItem.url}`;
    localHistoryMap.set(key, historyItem);
  }

  // Apply bookmarks
  for (const bookmark of snapshot.bookmarks) {
    const localBookmark = localBookmarkMap.get(
      `${bookmark.url}|${bookmark.title}`,
    );
    if (!localBookmark && bookmark.url) {
      try {
        await addBookmark(bookmark);
        results.bookmarksAdded++;
      } catch (error) {
        console.error("[Background] Failed to add bookmark:", error);
        results.errors.push({ type: "bookmark", error: error.message });
      }
    }
  }

  // Apply history
  for (const historyItem of snapshot.history) {
    const localHistory = localHistoryMap.get(historyItem.url);
    if (!localHistory) {
      try {
        await addHistoryItem(historyItem);
        results.historyAdded++;
      } catch (error) {
        console.error("[Background] Failed to add history item:", error);
        results.errors.push({ type: "history", error: error.message });
      }
    }
  }

  console.log("[Background] Applied snapshot:", results);
  return results;
}

/**
 * Add bookmark
 */
async function addBookmark(bookmark) {
  // Find or create parent folder
  const parentId = await findOrCreateParentFolder(bookmark.path);

  // Check if bookmark already exists
  const existing = await chrome.bookmarks.search({ url: bookmark.url });
  if (existing.length > 0) return;

  await chrome.bookmarks.create({
    parentId,
    title: bookmark.title,
    url: bookmark.url,
  });
}

/**
 * Find or create parent folder for bookmark
 */
async function findOrCreateParentFolder(path) {
  // Default to "Other Bookmarks"
  let currentParentId = "2";

  const pathParts = path.split("/").filter((p) => p);
  for (const folderName of pathParts) {
    const children = await chrome.bookmarks.getChildren(currentParentId);
    let found = children.find(
      (child) => child.title === folderName && !child.url,
    );

    if (!found) {
      found = await chrome.bookmarks.create({
        parentId: currentParentId,
        title: folderName,
      });
    }

    currentParentId = found.id;
  }

  return currentParentId;
}

/**
 * Add history item
 */
async function addHistoryItem(historyItem) {
  // Chrome History API doesn't have an 'add' method
  // We can only visit the URL to add it to history
  // This is a limitation of the Chrome API

  // For now, we'll use the visits API if available
  try {
    await chrome.history.addUrl({
      url: historyItem.url,
      title: historyItem.title,
      visitTime: historyItem.lastVisitTime,
    });
  } catch (error) {
    console.warn("[Background] Could not add history item:", error.message);
  }
}

/**
 * Encrypt data
 */
async function encryptData(data, passphrase) {
  const algorithm = "AES-GCM";
  const saltLength = 16;
  const ivLength = 12;
  const iterations = 100000;

  const salt = crypto.getRandomValues(new Uint8Array(saltLength));
  const iv = crypto.getRandomValues(new Uint8Array(ivLength));

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
      salt,
      iterations,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: algorithm, length: 256 },
    false,
    ["encrypt"],
  );

  const dataString = JSON.stringify(data);
  const dataBuffer = encoder.encode(dataString);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: algorithm,
      iv,
    },
    key,
    dataBuffer,
  );

  const encryptedArray = new Uint8Array(encryptedBuffer);
  const combined = new Uint8Array(
    saltLength + ivLength + encryptedArray.length,
  );
  combined.set(salt, 0);
  combined.set(iv, saltLength);
  combined.set(encryptedArray, saltLength + ivLength);

  return arrayBufferToBase64(combined.buffer);
}

/**
 * Decrypt data
 */
async function decryptData(encryptedBase64, passphrase) {
  const algorithm = "AES-GCM";
  const saltLength = 16;
  const ivLength = 12;
  const iterations = 100000;

  const combined = new Uint8Array(base64ToArrayBuffer(encryptedBase64));

  const salt = combined.slice(0, saltLength);
  const iv = combined.slice(saltLength, saltLength + ivLength);
  const encrypted = combined.slice(saltLength + ivLength);

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
      salt,
      iterations,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: algorithm, length: 256 },
    false,
    ["decrypt"],
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: algorithm,
      iv,
    },
    key,
    encrypted,
  );

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
 * Convert Base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Notify connection state change
 */
function notifyConnectionState(state, message) {
  console.log("[Background] Connection state:", state, message);

  // Update badge
  updateBadge(state);

  // Notify popup if open
  chrome.runtime
    .sendMessage({
      type: "connection_state",
      state,
      message,
      timestamp: Date.now(),
    })
    .catch(() => {
      // Popup might not be open, ignore error
    });
}

/**
 * Update extension badge
 */
function updateBadge(state) {
  const badges = {
    disconnected: { text: "", color: "#666666" },
    connecting: { text: "...", color: "#FFA500" },
    waiting: { text: "⏳", color: "#0000FF" },
    connected: { text: "✓", color: "#00FF00" },
    error: { text: "✗", color: "#FF0000" },
  };

  const badge = badges[state] || badges.disconnected;

  chrome.action.setBadgeText({ text: badge.text });
  chrome.action.setBadgeBackgroundColor({ color: badge.color });
}

/**
 * Disconnect
 */
async function disconnect() {
  console.log("[Background] Disconnecting...");

  try {
    await disconnectPeer();
  } catch (error) {
    console.error("[Background] Error during disconnect:", error);
  }

  state.connectionState = "disconnected";
  state.isInitialized = false;
  notifyConnectionState("disconnected", "Disconnected");
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

// Register message handlers
messageHandlers.set("initialize", async (data) => {
  return await initialize(data.passphrase, data.isPrimary);
});

messageHandlers.set("start_connection", async () => {
  return await startP2PConnection();
});

messageHandlers.set("sync", async () => {
  return await initiateSync();
});

messageHandlers.set("disconnect", async () => {
  return await disconnect();
});

messageHandlers.set("get_status", async () => {
  return getStatus();
});

console.log("[Background] Service worker initialized");
