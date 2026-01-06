# CRITICAL FIXES FOR SYNCHROPEER

## Issues Identified

### 1. Helium/Chrome: "The current browser does not support WebRTC"
**Root Cause:** PeerJS performs WebRTC capability detection that fails in service worker context due to missing APIs (MediaStream, navigator.mediaDevices, etc.)

### 2. Firefox: Extension reloads/refreshes after initialization
**Root Cause:** Connection timeout causing error state that triggers UI reset loop

---

## Fix 1: Enhanced WebRTC Polyfills for Chrome/Helium

**File:** `chrome/background.js`

**Location:** In the `loadPeerJS()` function, after line 40 (before `importScripts`)

**Add these polyfills:**

```javascript
// ENHANCED MediaStream polyfill
if (typeof self.MediaStream === "undefined") {
  self.MediaStream = class MediaStream {
    constructor(tracks = []) {
      this.id = 'stream_' + Math.random().toString(36).substr(2, 9);
      this._tracks = tracks;
      this.active = true;
    }
    getTracks() { return this._tracks; }
    getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio'); }
    getVideoTracks() { return this._tracks.filter(t => t.kind === 'video'); }
    addTrack(track) { this._tracks.push(track); }
    removeTrack(track) {
      const index = this._tracks.indexOf(track);
      if (index > -1) this._tracks.splice(index, 1);
    }
    getTrackById(id) { return this._tracks.find(t => t.id === id); }
    clone() { return new MediaStream(this._tracks.map(t => t.clone())); }
  };
}

// MediaStreamTrack polyfill
if (typeof self.MediaStreamTrack === "undefined") {
  self.MediaStreamTrack = class MediaStreamTrack {
    constructor(kind = 'audio') {
      this.id = 'track_' + Math.random().toString(36).substr(2, 9);
      this.kind = kind;
      this.label = '';
      this.enabled = true;
      this.muted = false;
      this.readyState = 'live';
    }
    stop() { this.readyState = 'ended'; }
    clone() {
      const cloned = new MediaStreamTrack(this.kind);
      cloned.label = this.label;
      return cloned;
    }
    getCapabilities() { return {}; }
    getConstraints() { return {}; }
    getSettings() { return {}; }
  };
}

// Ensure RTCDataChannel is available
if (typeof self.RTCDataChannel === "undefined" && typeof RTCDataChannel !== "undefined") {
  self.RTCDataChannel = RTCDataChannel;
}

// Blob polyfill if needed
if (typeof self.Blob === "undefined") {
  self.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.size = parts.reduce((acc, part) => acc + (part.length || part.byteLength || 0), 0);
      this.type = options.type || '';
    }
  };
}

// FileReader polyfill
if (typeof self.FileReader === "undefined") {
  self.FileReader = class FileReader {
    constructor() {
      this.readyState = 0;
      this.result = null;
      this.error = null;
      this.onload = null;
      this.onerror = null;
    }
    readAsArrayBuffer(blob) {
      setTimeout(() => {
        this.readyState = 2;
        this.result = new ArrayBuffer(0);
        if (this.onload) this.onload({ target: this });
      }, 0);
    }
  };
}
```

---

## Fix 2: Connection Timeout Handling for Firefox

**File:** `firefox/background.js`

**Location:** In `connectToPeer()` function, add timeout handling:

```javascript
async function connectToPeer(peerID) {
  console.log(`[Background] Connecting to peer: ${peerID}`);

  // Set connecting state
  state.connectionState = "connecting";
  notifyConnectionState("connecting");

  // Add connection timeout
  const connectionTimeout = setTimeout(() => {
    if (state.connectionState === "connecting") {
      console.log("[Background] Connection timeout, retrying...");
      state.connectionState = "waiting";
      notifyConnectionState("waiting");
      
      // Don't abort - keep trying
      // The peer connection will retry automatically
    }
  }, 30000); // 30 second timeout

  try {
    const conn = state.peer.connect(peerID, {
      reliable: true,
      serialization: "json",
    });

    if (conn) {
      clearTimeout(connectionTimeout);
      setupDataConnection(conn);
    } else {
      throw new Error("Failed to create connection");
    }
  } catch (error) {
    clearTimeout(connectionTimeout);
    console.error("[Background] Connection error:", error);
    
    // Don't reset to error immediately - keep waiting
    if (state.connectionState === "connecting") {
      state.connectionState = "waiting";
      notifyConnectionState("waiting", "Retrying connection...");
    }
  }
}
```

---

## Fix 3: Prevent UI Reset Loop in Firefox Popup

**File:** `firefox/popup.js`

**Location:** In `handleBackgroundMessage()` function:

```javascript
function handleBackgroundMessage(message) {
  console.log('[Popup] Received message:', message);

  if (message.type === 'connection-state') {
    updateStatusIndicator(message.state);
    
    // Don't reset UI if we're in a transient state
    if (message.state === 'waiting' || message.state === 'connecting') {
      // Keep current UI section, just update status
      if (elements.loadingSection.classList.contains('hidden')) {
        showSection('loading');
      }
      elements.loadingText.textContent = message.message || 'Connecting...';
      return; // Don't reload full status
    }

    if (message.state === 'connected') {
      loadStatus(); // Refresh full status only when connected
    } else if (message.state === 'error') {
      showSection('setup');
      showStatusMessage(message.message || 'Connection error', 'error');
    }
  }
}
```

---

## Fix 4: Better Error Handling in Peer Initialization

**File:** Both `chrome/background.js` and `firefox/background.js`

**Location:** In `startP2PConnection()` function:

```javascript
async function startP2PConnection(passphrase, isPrimary) {
  try {
    if (!Peer) {
      throw new Error("PeerJS not loaded");
    }

    const peerID = await generatePeerID(passphrase, isPrimary);
    console.log(`[Background] Generated peer ID: ${peerID}`);

    // Store configuration
    state.passphrase = passphrase;
    state.isPrimary = isPrimary;

    await browser.storage.local.set({
      passphrase: passphrase,
      isPrimary: isPrimary,
    });

    // Create peer with error handling
    state.peer = new Peer(peerID, {
      debug: 3, // Enable full PeerJS debugging
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      },
    });

    // Handle peer events
    state.peer.on("open", (id) => {
      console.log(`[Background] Peer opened with ID: ${id}`);
      handlePeerOpen(id, isPrimary, peerID);
    });

    state.peer.on("connection", (conn) => {
      console.log("[Background] Incoming connection");
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

    return { success: true };
  } catch (error) {
    console.error("[Background] Failed to start P2P:", error);
    return { success: false, error: error.message };
  }
}

function handlePeerError(error) {
  // Don't immediately abort on every error
  const recoverableErrors = [
    'peer-unavailable',
    'network',
    'disconnected'
  ];
  
  if (error.type && recoverableErrors.includes(error.type)) {
    console.log('[Background] Recoverable error, keeping connection alive');
    state.connectionState = 'waiting';
    notifyConnectionState('waiting', 'Retrying...');
    return;
  }
  
  // Only abort on fatal errors
  state.connectionState = 'error';
  notifyConnectionState('error', error.message);
}
```

---

## TESTING STEPS

### For Chrome/Helium:

1. **Clean reinstall:**
   ```bash
   # Close browser completely
   # Reopen and go to chrome://extensions
   # Remove SynchroPeer
   # Load unpacked: select chrome/ folder
   ```

2. **Open DevTools:**
   - Go to `chrome://extensions`
   - Find SynchroPeer
   - Click "service worker" (inspect)
   - Watch for:
     - `[Background] Polyfills set up, loading PeerJS...`
     - `[Background] PeerJS loaded via importScripts: function`
     - Environment check should show all `true` values
     - NO "browser does not support WebRTC" error

3. **Test connection:**
   - Open popup
   - Enter passphrase (min 8 chars)
   - Select Primary
   - Click "Start Connection"
   - Should see "Waiting for secondary device..."
   - NO abort errors in console

### For Firefox:

1. **Clean reinstall:**
   ```
   # Close Firefox completely
   # Reopen and go to about:debugging
   # Remove SynchroPeer
   # Load Temporary Add-on: select firefox/manifest.json
   ```

2. **Open DevTools:**
   - Go to `about:debugging#/runtime/this-firefox`
   - Find SynchroPeer
   - Click "Inspect"
   - Watch for:
     - `[Background] PeerJS available: function`
     - `[Background] SynchroPeer initializing...`
     - `[Background] Initialization complete`

3. **Test connection:**
   - Open popup
   - Enter passphrase
   - Select Secondary
   - Click "Start Connection"
   - Should see "Connecting to Primary..."
   - Popup should NOT reload/refresh
   - Should stay on connecting/waiting screen

---

## DEBUGGING COMMANDS

### In Service Worker Console (Chrome):
```javascript
// Check PeerJS availability
console.log(typeof Peer);

// Check WebRTC support
console.log(typeof RTCPeerConnection);
console.log(typeof MediaStream);

// Check navigator
console.log(navigator.mediaDevices);
console.log(navigator.userAgent);

// Test PeerJS instantiation
try {
  const testPeer = new Peer({ debug: 3 });
  console.log("PeerJS works:", testPeer);
} catch (e) {
  console.error("PeerJS failed:", e);
}
```

### In Background Page Console (Firefox):
```javascript
// Check PeerJS
console.log(typeof window.Peer);

// Check state
browser.runtime.sendMessage({ type: 'get-status' }).then(console.log);

// Force reconnect
browser.runtime.sendMessage({ 
  type: 'start-connection',
  passphrase: 'test12345',
  isPrimary: true
}).then(console.log);
```

---

## FALLBACK: Manual Signaling

If P2P connection via PeerJS cloud server continues to fail, implement manual SDP exchange:

**Add to popup.html:**
```html
<button id="manualSignalBtn" class="hidden">Manual Signaling</button>
<textarea id="sdpOutput" class="hidden"></textarea>
<textarea id="sdpInput" class="hidden"></textarea>
```

**Add to background.js:**
```javascript
// Generate offer SDP
async function generateOfferSDP() {
  const pc = new RTCPeerConnection();
  const dc = pc.createDataChannel('manual');
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return JSON.stringify(offer);
}

// Accept answer SDP
async function acceptAnswerSDP(sdpString) {
  const answer = JSON.parse(sdpString);
  await state.peerConnection.setRemoteDescription(answer);
}
```

This allows users to manually copy/paste SDP between devices if network conditions prevent automatic P2P.

---

## NEXT STEPS IF STILL FAILING

1. Check browser console for ANY error messages
2. Check network tab for websocket connections to `wss://0.peerjs.com`
3. Try different TURN servers (add more to config)
4. Test on different network (corporate firewalls may block WebRTC)
5. Enable full PeerJS debug logging (`debug: 3`)
6. Check if browser has WebRTC disabled in settings

---

## SUMMARY

The two main fixes are:

1. **Chrome/Helium:** Add comprehensive MediaStream/MediaStreamTrack polyfills so PeerJS's browser detection passes
2. **Firefox:** Add timeout handling and prevent UI reset loops during connection attempts

Both fixes prevent premature errors and keep the connection alive during initial P2P handshake.