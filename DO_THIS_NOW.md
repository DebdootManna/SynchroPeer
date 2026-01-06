# DO THIS NOW - Quick Action Checklist

## Step 1: Clean Reinstall (REQUIRED!)

### Helium/Chrome:
1. Close Helium completely
2. Reopen → Go to `chrome://extensions`
3. Find SynchroPeer → Click "Remove"
4. Click "Load unpacked"
5. Select folder: `SynchroPeer/chrome`

### Firefox:
1. Close Firefox completely
2. Reopen → Go to `about:debugging#/runtime/this-firefox`
3. Find SynchroPeer → Click "Remove"
4. Click "Load Temporary Add-on"
5. Select file: `SynchroPeer/firefox/manifest.json`

---

## Step 2: Open Developer Consoles

### Helium/Chrome:
1. Go to `chrome://extensions`
2. Find SynchroPeer
3. Click **"service worker"** (blue link)
4. Console opens → THIS IS THE IMPORTANT ONE

### Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Find SynchroPeer
3. Click **"Inspect"** button
4. Console opens → THIS IS THE IMPORTANT ONE

---

## Step 3: Check Console Output

### ✅ YOU SHOULD SEE (Helium):
```
[Background] Polyfills set up, loading PeerJS...
[Background] Environment check: { hasMediaStream: true, ... }
[Background] PeerJS loaded via importScripts: function
[Background] Initialization complete
```

### ✅ YOU SHOULD SEE (Firefox):
```
[Background] PeerJS available: function
[Background] Initialization complete
```

### ❌ YOU SHOULD NOT SEE:
- "The current browser does not support WebRTC"
- "ERROR PeerJS: Aborting!"
- "browser-incompatible"

---

## Step 4: Test Connection

1. Click extension icon (opens popup)
2. Enter passphrase: `testpass123456`
3. Select "Primary"
4. Click "Start Connection"

**Expected:**
- Shows "Waiting for secondary device..."
- NO errors in console
- NO popup refresh/reload

---

## Step 5: Report Results

**If successful:** 🎉 Move to two-device testing

**If failed:** Copy and send:
1. Browser name + version
2. Full console output (from background console)
3. Screenshot of any errors

---

## Quick Debug Test

Copy/paste this in the **background console**:

```javascript
// For Helium/Chrome:
console.log({
  Peer: typeof Peer,
  MediaStream: typeof MediaStream,
  RTCPeerConnection: typeof RTCPeerConnection
});

// For Firefox:
console.log({
  Peer: typeof window.Peer,
  MediaStream: typeof MediaStream,
  RTCPeerConnection: typeof RTCPeerConnection
});
```

**All should show:** `function` or `true`

---

## Common Mistakes

- ❌ Didn't close browser completely before reinstall
- ❌ Looking at popup console instead of background console
- ❌ Didn't reload extension after code changes
- ❌ Using old cached version

---

## Files Changed

If you want to see what was fixed:
- `chrome/background.js` - Added MediaStream polyfills
- `firefox/background.js` - Added error recovery logic
- See `FIXES_APPLIED.md` for full details

---

## Need Help?

1. Check `TEST_NOW.md` for detailed testing steps
2. Check `CRITICAL_FIXES.md` for technical details
3. Check background console for error messages
4. Verify clean reinstall was done correctly