/**
 * SynchroPeer - Offscreen Document
 * Handles WebRTC/PeerJS operations in a full document context
 * This runs in a hidden document with full DOM/WebRTC APIs
 */

console.log("[Offscreen] Starting offscreen document...");
console.log("[Offscreen] RTCPeerConnection available:", typeof RTCPeerConnection !== "undefined");
console.log("[Offscreen] PeerJS available:", typeof Peer !== "undefined");

let peer = null;
let connection = null;
let state = {
  isPrimary: false,
  passphrase: null,
  connectionState: "disconnected"
};

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message.type);

  switch (message.type) {
    case "PEER_INIT":
      handlePeerInit(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response

    case "PEER_CONNECT":
      handlePeerConnect(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case "PEER_SEND":
      handlePeerSend(message.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case "PEER_DISCONNECT":
      handlePeerDisconnect()
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case "PEER_STATUS":
      sendResponse({
        success: true,
        data: {
          connected: connection?.open || false,
          peerConnected: peer?.disconnected === false,
          peerId: peer?.id || null,
          connectionState: state.connectionState
        }
      });
      return false;

    default:
      console.warn("[Offscreen] Unknown message type:", message.type);
      sendResponse({ success: false, error: "Unknown message type" });
      return false;
  }
});

/**
 * Initialize PeerJS
 */
async function handlePeerInit(data) {
  const { peerId, config, isPrimary, passphrase } = data;

  console.log("[Offscreen] Initializing peer:", peerId);

  state.isPrimary = isPrimary;
  state.passphrase = passphrase;

  // Clean up existing peer
  if (peer) {
    peer.destroy();
    peer = null;
  }

  return new Promise((resolve, reject) => {
    try {
      peer = new Peer(peerId, config);

      peer.on("open", (id) => {
        console.log("[Offscreen] Peer opened with ID:", id);
        state.connectionState = isPrimary ? "waiting" : "connecting";
        notifyServiceWorker({
          type: "PEER_OPENED",
          data: { id, isPrimary }
        });
        resolve({ peerId: id });
      });

      peer.on("connection", (conn) => {
        console.log("[Offscreen] Incoming connection from:", conn.peer);
        setupConnection(conn);
        notifyServiceWorker({
          type: "PEER_INCOMING_CONNECTION",
          data: { peer: conn.peer }
        });
      });

      peer.on("disconnected", () => {
        console.log("[Offscreen] Peer disconnected from server");
        state.connectionState = "disconnected";
        notifyServiceWorker({
          type: "PEER_DISCONNECTED",
          data: {}
        });
      });

      peer.on("close", () => {
        console.log("[Offscreen] Peer connection closed");
        state.connectionState = "disconnected";
        notifyServiceWorker({
          type: "PEER_CLOSED",
          data: {}
        });
      });

      peer.on("error", (error) => {
        console.error("[Offscreen] Peer error:", error);
        notifyServiceWorker({
          type: "PEER_ERROR",
          data: { error: error.message, type: error.type }
        });
        reject(error);
      });

    } catch (error) {
      console.error("[Offscreen] Failed to create peer:", error);
      reject(error);
    }
  });
}

/**
 * Connect to another peer
 */
async function handlePeerConnect(data) {
  const { targetPeerId } = data;

  console.log("[Offscreen] Connecting to peer:", targetPeerId);

  if (!peer) {
    throw new Error("Peer not initialized");
  }

  return new Promise((resolve, reject) => {
    try {
      const conn = peer.connect(targetPeerId, {
        reliable: true,
        serialization: "json"
      });

      setupConnection(conn);

      // Set timeout for connection
      const timeout = setTimeout(() => {
        if (!conn.open) {
          console.error("[Offscreen] Connection timeout");
          reject(new Error("Connection timeout"));
        }
      }, 30000);

      conn.on("open", () => {
        clearTimeout(timeout);
        resolve({ connected: true });
      });

    } catch (error) {
      console.error("[Offscreen] Failed to connect:", error);
      reject(error);
    }
  });
}

/**
 * Setup connection event handlers
 */
function setupConnection(conn) {
  connection = conn;

  conn.on("open", () => {
    console.log("[Offscreen] Data connection opened");
    state.connectionState = "connected";
    notifyServiceWorker({
      type: "CONNECTION_OPENED",
      data: { peer: conn.peer }
    });
  });

  conn.on("data", (data) => {
    console.log("[Offscreen] Received data:", data.type || "unknown");
    notifyServiceWorker({
      type: "CONNECTION_DATA",
      data: data
    });
  });

  conn.on("close", () => {
    console.log("[Offscreen] Data connection closed");
    state.connectionState = "disconnected";
    connection = null;
    notifyServiceWorker({
      type: "CONNECTION_CLOSED",
      data: {}
    });
  });

  conn.on("error", (error) => {
    console.error("[Offscreen] Connection error:", error);
    notifyServiceWorker({
      type: "CONNECTION_ERROR",
      data: { error: error.message }
    });
  });
}

/**
 * Send data through the connection
 */
async function handlePeerSend(data) {
  console.log("[Offscreen] Sending data:", data.message?.type || "unknown");

  if (!connection || !connection.open) {
    throw new Error("No active connection");
  }

  return new Promise((resolve, reject) => {
    try {
      connection.send(data.message);
      resolve({ sent: true });
    } catch (error) {
      console.error("[Offscreen] Failed to send data:", error);
      reject(error);
    }
  });
}

/**
 * Disconnect and cleanup
 */
async function handlePeerDisconnect() {
  console.log("[Offscreen] Disconnecting...");

  if (connection) {
    connection.close();
    connection = null;
  }

  if (peer) {
    peer.destroy();
    peer = null;
  }

  state.connectionState = "disconnected";

  return { disconnected: true };
}

/**
 * Notify the service worker of events
 */
function notifyServiceWorker(message) {
  chrome.runtime.sendMessage(message).catch(error => {
    console.warn("[Offscreen] Failed to notify service worker:", error.message);
  });
}

console.log("[Offscreen] Offscreen document ready");
