# SynchroPeer Quick Fix Guide

## 🚨 CRITICAL: Complete Reinstall Required

The fixes won't work unless you do a complete reinstall!

**Latest Fix (Session 3):** Fixed `browser.action` error in Firefox and enhanced Chrome polyfills

---

## For Firefox Users

### Step 1: Remove Old Extension
1. Go to `about:debugging#/runtime/this-firefox`
2. Find "SynchroPeer"
3. Click "Remove"
4. **Close Firefox completely** (Cmd+Q on Mac, Alt+F4 on Windows)

### Step 2: Reinstall Fresh
1. Reopen Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to your project folder
5. Select `firefox/manifest.json` file

### Step 3: Verify It Loaded
1. Click "Inspect" button next to SynchroPeer
2. Look for this message in console:
   ```
   [Background] PeerJS available: function
   ```
3. If you see this, PeerJS loaded successfully! ✅

### Step 4: Test Connection
1. Click the SynchroPeer icon in toolbar
2. Select "Primary" or "Secondary"
3. Enter a passphrase (min 8 characters)
4. Click "Start Connection"
5. Should show loading screen with "Starting as Primary..." or "Connecting to Primary..."

---

## For Helium/Chrome Users

### Step 1: Remove Old Extension
1. Go to `chrome://extensions/` (or `helium://extensions/`)
2. Find "SynchroPeer"
3. Click "Remove"
4. **Close browser completely**

### Step 2: Reinstall Fresh
1. Reopen browser
2. Go to `chrome://extensions/` (or `helium://extensions/`)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `chrome/` folder (NOT the repository root!)

### Step 3: Verify It Loaded
1. Click "Inspect views service worker" link
2. Look for this message in console:
   ```
   [Background] PeerJS loaded via importScripts: function
   ```
3. If you see this, PeerJS loaded successfully! ✅

### Step 4: Test Connection
1. Click the SynchroPeer icon in toolbar
2. Select "Primary" or "Secondary"
3. Enter a passphrase (min 8 characters)
4. Click "Start Connection"
5. Should show loading screen, **NOT** refresh back to setup screen

---

## 🐛 If You Still See Errors

### Collect Debug Info:

**For Firefox:**
```
1. Open about:debugging#/runtime/this-firefox
2. Click "Inspect" on SynchroPeer
3. Copy ALL console messages
4. Click extension icon to open popup
5. Press F12 while popup is open
6. Copy ALL popup console messages
```

**For Chrome/Helium:**
```
1. Go to chrome://extensions/
2. Click "Inspect views service worker"
3. Copy ALL console messages
4. Click extension icon to open popup
5. Right-click popup → Inspect
6. Copy ALL popup console messages
```

### Common Issues After Reinstall:

**"PeerJS not available" or similar:**
- Make sure you loaded the CORRECT folder
  - Firefox: Load the `firefox/` folder
  - Chrome: Load the `chrome/` folder
  - NOT the repository root!

**Popup shows setup screen after clicking Connect:**
- Check service worker console (Chrome) or background console (Firefox)
- Look for initialization messages
- If empty, the background script didn't load

**"Browser not supported" or WebRTC errors:**
- Verify you're on a recent browser version:
  - Firefox 91+
  - Chrome 72+
  - Safari 605+ (if applicable)

---

## 📝 What Was Fixed

### Firefox Issues:
- ✅ Created `background.html` to load PeerJS properly
- ✅ Changed manifest to use HTML page instead of script array
- ✅ Removed unreliable dynamic script loading
- ✅ Fixed badge API compatibility (`browserAction` vs `action`)

### Chrome/Helium Issues:
- ✅ Added auto-initialization when popup sends first message
- ✅ Added PeerJS availability check before creating connections
- ✅ Enhanced navigator polyfill with complete browser environment
- ✅ Added detailed error logging for PeerJS initialization
- ✅ Fixed platform/userAgent detection for PeerJS compatibility

---

## ✅ Success Indicators

You'll know it's working when:

1. **No console errors** about "Peer is not a constructor"
2. **No console errors** about "navigator undefined"
3. **Loading screen appears** when you click "Start Connection"
4. **Badge shows status**:
   - `...` = Connecting
   - `⏳` = Waiting for peer
   - `✓` = Connected
   - `!` = Error

---

## 🆘 Still Need Help?

If you still see errors after following these steps:

1. Take screenshots of BOTH consoles (background + popup)
2. Note which browser and exact version
3. Note which folder you loaded (`chrome/` or `firefox/`)
4. Share the exact error messages
5. Mention if you've tested on both devices or just one

---

Last Updated: January 6, 2025 (Session 3 - Badge API & Enhanced Polyfills)