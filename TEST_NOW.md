# IMMEDIATE TESTING GUIDE

## Quick Test Commands

### 1. Clean Reinstall (REQUIRED)

**Chrome/Helium:**
```bash
# 1. Close browser completely
# 2. Open chrome://extensions
# 3. Remove SynchroPeer if present
# 4. Click "Load unpacked"
# 5. Select: SynchroPeer/chrome folder
```

**Firefox:**
```bash
# 1. Close Firefox completely
# 2. Open about:debugging#/runtime/this-firefox
# 3. Remove SynchroPeer if present
# 4. Click "Load Temporary Add-on"
# 5. Select: SynchroPeer/firefox/manifest.json
```

---

## 2. Open Developer Consoles

### Chrome/Helium:
1. Go to `chrome://extensions`
2. Find "SynchroPeer"
3. Click **"service worker"** (blue link) → Opens background console
4. Click extension icon → Popup opens
5. Press F12 in popup → Opens popup console

### Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Find "SynchroPeer"
3. Click **"Inspect"** → Opens background console
4. Click extension icon → Popup opens
5. Press Ctrl+Shift+I (or Cmd+Opt+I on Mac) in popup → Opens popup console

---

## 3. Expected Console Output

### Chrome/Helium Background Console:
✅ **YOU SHOULD SEE:**
```
[Background] Polyfills set up, loading PeerJS...
[Background] Environment check: {
  hasWindow: true,
  hasNavigator: true,
  hasLocation: true,
  hasMediaDevices: true,
  hasRTCPeerConnection: true,
  hasRTCPeerConnectionOnSelf: true,
  hasMediaStream: true,
  hasMediaStreamOnSelf: true,
  navigatorPlatform: "Win32",
  navigatorUserAgent: "Mozilla/5.0..."
}
[Background] PeerJS loaded via importScripts: function
[Background] SynchroPeer initializing...
[Background] Initialization complete
```

❌ **YOU SHOULD NOT SEE:**
- "The current browser does not support WebRTC"
- "Aborting!"
- "browser-incompatible"

### Firefox Background Console:
✅ **YOU SHOULD SEE:**
```
[Background] PeerJS available: function
[Background] SynchroPeer initializing...
[Background] Initialization complete
```

---

## 4. Test Connection (Single Device Test)

### Test as Primary:
1. Open popup
2. Enter passphrase: `testpass123456`
3. Select **"Primary"**
4. Click **"Start Connection"**

**Expected behavior:**
- Status changes to "Waiting for peer..."
- Console shows: `[Background] Peer opened with ID: sp-xxxxx`
- Console shows: `[Background] Waiting for connection as primary`
- **NO errors**
- **NO popup reload/refresh**

### Background Console Commands (Chrome):
```javascript
// Check if PeerJS is loaded
typeof Peer

// Check WebRTC support
typeof RTCPeerConnection

// Check MediaStream
typeof MediaStream

// Check state
console.log(state)
```

### Background Console Commands (Firefox):
```javascript
// Check PeerJS
typeof window.Peer

// Get current status
browser.runtime.sendMessage({ type: 'get-status' }).then(console.log)
```

---

## 5. Debugging Checklist

If you see errors:

### Chrome/Helium Issues:

**Error: "The current browser does not support WebRTC"**
- [ ] Did you do a clean reinstall?
- [ ] Check Environment check output - are all values `true`?
- [ ] Run in console: `console.log(typeof MediaStream, typeof RTCPeerConnection)`
- [ ] If still failing, check: Is RTCPeerConnection actually available globally?

**Error: "PeerJS: Aborting!"**
- [ ] Check network tab for failed requests to `wss://0.peerjs.com`
- [ ] Try different network (not corporate firewall)
- [ ] Check if WebRTC is disabled in browser settings

### Firefox Issues:

**Popup keeps reloading:**
- [ ] Check background console for connection errors
- [ ] Look for repeated "Initialization" messages
- [ ] Check if `handlePeerError` function exists
- [ ] Verify popup doesn't call `loadStatus()` repeatedly

**Connection timeout:**
- [ ] Normal! It will keep retrying
- [ ] Should show "Waiting for peer..." not "Error"
- [ ] Background should show "Recoverable error, keeping connection alive"

---

## 6. Copy/Paste This Test

**In Background Console (Chrome):**
```javascript
// Quick test
(async function() {
  console.log("=== WEBRTC CHECK ===");
  console.log("RTCPeerConnection:", typeof RTCPeerConnection);
  console.log("MediaStream:", typeof MediaStream);
  console.log("MediaStreamTrack:", typeof MediaStreamTrack);
  console.log("navigator.mediaDevices:", typeof navigator.mediaDevices);
  console.log("Peer:", typeof Peer);
  
  if (typeof Peer === 'function') {
    try {
      const testPeer = new Peer({ debug: 0 });
      console.log("✅ PeerJS instantiation works!");
      testPeer.destroy();
    } catch (e) {
      console.error("❌ PeerJS instantiation failed:", e);
    }
  }
})();
```

**In Background Console (Firefox):**
```javascript
// Quick test
(function() {
  console.log("=== WEBRTC CHECK ===");
  console.log("RTCPeerConnection:", typeof RTCPeerConnection);
  console.log("MediaStream:", typeof MediaStream);
  console.log("Peer:", typeof window.Peer);
  
  if (typeof window.Peer === 'function') {
    try {
      const testPeer = new window.Peer({ debug: 0 });
      console.log("✅ PeerJS instantiation works!");
      testPeer.destroy();
    } catch (e) {
      console.error("❌ PeerJS instantiation failed:", e);
    }
  }
})();
```

---

## 7. Success Criteria

✅ **Chrome/Helium Success:**
- No "WebRTC not supported" error
- PeerJS loads successfully
- Can create Peer instance
- "Waiting for peer..." message shows
- No abort/reload

✅ **Firefox Success:**
- No badge API errors
- PeerJS available
- Popup doesn't reload
- Shows "Waiting for peer..." not "Error"
- Background keeps retrying on timeout

---

## 8. Report Results

If it works: 🎉 Great!

If it still fails, provide:
1. **Browser:** Chrome/Helium/Firefox + version
2. **Console output:** Copy entire background console log
3. **Error messages:** Any red errors
4. **Environment check:** The object logged after "Environment check:"
5. **Test script result:** Output from the quick test above

---

## Common Gotchas

- **Forgot clean reinstall** → Old service worker cached
- **Wrong console** → Looking at popup console instead of background
- **Network issues** → Corporate firewall blocking WebRTC/WebSocket
- **Browser settings** → WebRTC disabled in privacy settings
- **Service worker sleeping** → Click extension icon to wake it up

---

## Next Steps After Successful Test

Once both browsers show successful initialization:

1. Test on TWO devices:
   - Device 1: Primary role
   - Device 2: Secondary role (same passphrase)
   - Should connect and show "Connected" status

2. Test sync:
   - Add bookmark on one device
   - Click "Sync Now"
   - Check other device for bookmark

3. Monitor for stability:
   - Leave connected for 5 minutes
   - Check if connection stays alive
   - Try syncing multiple times