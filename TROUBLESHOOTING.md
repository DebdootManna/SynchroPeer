# SynchroPeer Troubleshooting Guide

## Latest Fixes (January 6, 2025 - Session 2)

### Quick Summary of Changes Made

**Firefox:**
1. Created `firefox/background.html` to load PeerJS via HTML instead of dynamic script injection
2. Updated `firefox/manifest.json` to use `"page": "background.html"` instead of scripts array
3. Simplified `firefox/background.js` to remove dynamic PeerJS loading code

**Chrome/Helium:**
1. Added initialization check in message handler to ensure background is ready before processing messages
2. Added PeerJS availability check before creating peer connections
3. Enhanced navigator polyfill with more complete properties for PeerJS compatibility

**Why These Changes?**
- Firefox was blocking dynamic script loading from `moz-extension://` URLs
- Chrome service worker was not initialized when popup tried to communicate
- PeerJS needs complete browser API polyfills in service worker context

---

## Recent Fixes (January 2025 - Session 1)

### Issue 1: Helium/Chrome - PeerJS Navigator Error
**Error:** `this.isIOS="undefined"!=typeof navigator`

**Root Cause:** PeerJS library requires access to the `navigator` object, but in a Manifest V3 service worker context, `navigator` properties like `userAgent` and `platform` may not be fully initialized.

**Fix Applied:**
- Enhanced the service worker polyfill in `chrome/background.js` to include comprehensive `navigator` properties:
  - `userAgent`
  - `platform`
  - `vendor`
- Also added complete `location` object with `protocol`, `host`, `hostname`, and `href`

**Location:** `chrome/background.js` lines 26-40

---

### Issue 2: Firefox - Peer is not a constructor
**Error:** `TypeError: Peer is not a constructor`

**Root Cause:** 
1. Firefox background script was using `eval()` to load PeerJS, which is unreliable and blocked by CSP
2. The manifest had `persistent: false`, which creates an event page without DOM access

**Fix Applied:**
1. Replaced `eval()`-based loading with proper DOM script injection using `document.createElement("script")`
2. Changed `persistent: false` to `persistent: true` in Firefox manifest to ensure DOM access
3. Added proper error handling and console logging

**Locations:** 
- `firefox/background.js` lines 13-34
- `firefox/manifest.json` line 15

---

## How to Test the Fixes

### For Helium/Chromium:
1. **Remove the extension completely:**
   - Go to `chrome://extensions/`
   - Click "Remove" on SynchroPeer
   - Close Helium completely

2. **Reinstall cleanly:**
   - Reopen Helium
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome/` folder (NOT the repository root!)

3. **Check console logs:**
   - Click "Inspect views service worker"
   - Look for: `[Background] PeerJS loaded via importScripts: function`
   - Should NOT see navigator/window errors

4. **Test connection:**
   - Click the extension icon to open popup
   - Select role (Primary/Secondary)
   - Enter passphrase
   - Click Connect
   - Monitor both popup console and service worker console

### For Firefox:
1. **Remove the extension:**
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Remove" on SynchroPeer
   - Close Firefox completely

2. **Reinstall cleanly:**
   - Reopen Firefox
   - Go to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select `firefox/manifest.json` file

3. **Check console logs:**
   - Click "Inspect" on SynchroPeer
   - Look for: `[Background] PeerJS loaded via script tag: function`
   - Should NOT see "Peer is not a constructor"

4. **Test connection:**
   - Same as Chromium steps above

---

## Common Issues

### "Could not load manifest"
**Problem:** Loading the wrong directory

**Solution:** 
- For Chromium/Helium: Load the `chrome/` folder
- For Firefox: Select the `firefox/manifest.json` file
- DO NOT load the repository root directory

### WebRTC Not Supported Error
**Problem:** Browser doesn't support WebRTC or it's disabled

**Solution:**
- Check browser version (should be recent)
- Verify WebRTC is not disabled in browser settings
- For Helium: Ensure it's based on a recent Chromium version

### Connection Timeout
**Problem:** Peers cannot find each other through signaling server

**Possible Causes:**
1. Firewall blocking WebRTC connections
2. PeerJS signaling server (0.peerjs.com) is down
3. Mismatched passphrases
4. Both peers set to same role (both Primary or both Secondary)

**Solutions:**
- Check firewall settings
- Ensure one device is Primary, other is Secondary
- Use exact same passphrase on both devices
- Wait 30-60 seconds for connection to establish

### Popup Not Rendering
**Problem:** White screen or broken layout

**Solutions:**
- Clear browser cache
- Remove and reinstall extension
- Check browser console for errors
- Verify all files in `icons/` directory exist

---

## Console Commands for Debugging

### Check if PeerJS is loaded:
```javascript
// In background/service worker console:
console.log(typeof Peer);
// Should output: "function"
```

### Check current connection state:
```javascript
// In background/service worker console:
browser.runtime.sendMessage({ type: 'get-status' })
  .then(status => console.log(status));
```

### Manually test encryption:
```javascript
// In background/service worker console (requires connection setup):
const testData = { test: "hello" };
encryptData(testData, "mypassphrase123")
  .then(encrypted => decryptData(encrypted, "mypassphrase123"))
  .then(decrypted => console.log(decrypted));
```

---

## Architecture Notes

### Chrome (Manifest V3):
- Uses service worker (no DOM, no window object)
- PeerJS loaded via `importScripts()`
- Requires polyfills for `window`, `document`, `navigator`, `location`

### Firefox (Manifest V2):
- Uses persistent background page (has DOM access)
- PeerJS loaded via dynamic `<script>` tag injection
- No polyfills needed

### Why Two Different Approaches?
- **Manifest V3** (Chrome): Forces service workers, no DOM → must use `importScripts`
- **Manifest V2** (Firefox): Supports background pages with DOM → can use script tags

---

## Environment Variables for Testing

Create a `.env` file in the repository root for testing configurations:

```bash
# PeerJS Server Configuration
PEERJS_HOST=0.peerjs.com
PEERJS_PORT=443
PEERJS_PATH=/

# Debug Settings
DEBUG_MODE=true
LOG_LEVEL=debug
```

(Note: Not currently implemented, but recommended for future development)

---

## Next Steps if Issues Persist

1. **Collect detailed logs:**
   - Service worker/background console output
   - Popup console output
   - Network tab (filter by "peerjs")

2. **Check browser compatibility:**
   ```javascript
   // Run in any console:
   console.log({
     browser: navigator.userAgent,
     webrtc: typeof RTCPeerConnection,
     serviceWorker: typeof ServiceWorkerGlobalScope
   });
   ```

3. **Test PeerJS independently:**
   - Create minimal test HTML file
   - Load PeerJS from CDN
   - Verify it works outside extension context

4. **Report issues:**
   - Include browser name and version
   - Include full console output
   - Include steps to reproduce

---

## Clean Reinstall Checklist

- [ ] Remove extension from browser
- [ ] Close browser completely
- [ ] Reopen browser
- [ ] Load correct folder (`chrome/` for Chromium, `firefox/` for Firefox)
- [ ] Open service worker/background console
- [ ] Verify PeerJS loads successfully
- [ ] Open popup
- [ ] Open popup console (F12 while popup is focused)
- [ ] Test connection with valid passphrase
- [ ] Monitor both consoles during connection

---

## Quick Reference: File Locations

| Component | Chrome Path | Firefox Path |
|-----------|-------------|--------------|
| Manifest | `chrome/manifest.json` | `firefox/manifest.json` |
| Background Script | `chrome/background.js` | `firefox/background.js` |
| Popup HTML | `chrome/popup.html` | `firefox/popup.html` |
| Popup Script | `chrome/popup.js` | `firefox/popup.js` |
| PeerJS Library | `chrome/lib/peerjs.min.js` | `firefox/lib/peerjs.min.js` |

---

## Current Status After Latest Fixes

### What Should Work Now:

**Firefox:**
- ✅ PeerJS loads via background.html (no more dynamic loading errors)
- ✅ Background page has full DOM access
- ✅ No more "Peer is not a constructor" errors
- ⏳ Connection logic should initialize properly

**Chrome/Helium:**
- ✅ Service worker initializes on first message if not already initialized
- ✅ PeerJS availability checked before use
- ✅ Navigator polyfill includes all required properties
- ⏳ Popup should communicate with background successfully

### Testing Steps After Latest Fixes:

1. **Complete Reinstall** (IMPORTANT!)
   - Remove extension completely
   - Close browser
   - Reopen and reinstall from correct folder

2. **Check Console Logs:**
   - Firefox: Should see `[Background] PeerJS available: function`
   - Chrome: Should see `[Background] PeerJS loaded via importScripts: function`

3. **Try Connection:**
   - Open popup
   - Select role
   - Enter passphrase
   - Click "Start Connection"
   - Should see loading screen, not refresh back to setup

4. **If Still Issues:**
   - Open background console first
   - Then open popup
   - Check both consoles for errors
   - Report exact error messages

---

## Support

If you encounter issues not covered here, please:
1. Check the console logs carefully
2. Review the conversation history in the Zed thread
3. Search for similar issues in the PeerJS GitHub repository
4. Consider alternative P2P libraries if PeerJS continues to cause problems

**New Issues to Report:**
- Exact browser name and version
- Which fixes were applied (Session 1 or Session 2)
- Full console output from BOTH background and popup
- Screenshots of the error state

---

Last Updated: January 6, 2025 (Session 2 - Message Handler & Firefox HTML Loading)