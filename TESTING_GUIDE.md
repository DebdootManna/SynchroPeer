# SynchroPeer - Developer Testing Guide

Complete step-by-step guide for testing SynchroPeer between Chrome and Firefox on macOS.

---

## 📋 Prerequisites

Before you begin testing, ensure you have:

- ✅ macOS (or Linux/Windows with minor adjustments)
- ✅ Node.js 14+ installed
- ✅ Google Chrome (latest version)
- ✅ Mozilla Firefox (latest version)
- ✅ Terminal access
- ✅ Basic understanding of browser extensions

---

## 🚀 Step 1: Build the Extension

### 1.1 Navigate to Project Directory

```bash
cd SynchroPeer
```

### 1.2 Install Dependencies

```bash
npm install
```

Expected output:
```
added 11 packages, and audited 12 packages in 4s
found 0 vulnerabilities
```

### 1.3 Build for Both Browsers

```bash
npm run build
```

Expected output:
```
📦 Building for chrome...
✅ chrome build complete at dist/chrome

📦 Building for firefox...
✅ firefox build complete at dist/firefox
```

### 1.4 Verify Build Output

```bash
ls -la dist/chrome
ls -la dist/firefox
```

You should see:
- `manifest.json`
- `background.js`
- `popup.html`, `popup.css`, `popup.js`
- `utils/` directory
- `lib/` directory (with PeerJS)
- `icons/` directory

---

## 🌐 Step 2: Load Extension in Chrome

### 2.1 Open Chrome Extensions Page

1. Open Google Chrome
2. Navigate to: `chrome://extensions/`
3. Or use menu: **More Tools** → **Extensions**

### 2.2 Enable Developer Mode

1. Look for **Developer mode** toggle in top-right corner
2. Click to enable it
3. New buttons will appear: "Load unpacked", "Pack extension", "Update"

### 2.3 Load the Extension

1. Click **Load unpacked** button
2. Navigate to your project: `SynchroPeer/dist/chrome`
3. Click **Select** to load the folder

### 2.4 Verify Installation

You should see:
- ✅ SynchroPeer card with icon
- ✅ Extension ID (e.g., `abcdefghijklmnopqrstuvwxyz`)
- ✅ Status: "Enabled"
- ✅ No errors shown

### 2.5 Pin Extension to Toolbar

1. Click the **puzzle piece icon** (Extensions) in Chrome toolbar
2. Find **SynchroPeer** in the list
3. Click the **pin icon** to pin it to toolbar

---

## 🦊 Step 3: Load Extension in Firefox

### 3.1 Open Firefox Debugging Page

1. Open Mozilla Firefox
2. Navigate to: `about:debugging#/runtime/this-firefox`
3. Or type `about:debugging` and click **This Firefox** in sidebar

### 3.2 Load Temporary Add-on

1. Click **Load Temporary Add-on...** button
2. Navigate to: `SynchroPeer/dist/firefox`
3. Select **manifest.json** file
4. Click **Open**

### 3.3 Verify Installation

You should see:
- ✅ SynchroPeer listed under "Temporary Extensions"
- ✅ Internal UUID shown
- ✅ No warning or error messages
- ✅ "Inspect", "Reload", "Remove" buttons available

### 3.4 Access Extension

1. Click the **puzzle piece icon** (Extensions) in Firefox toolbar
2. Find **SynchroPeer** and click it

**Note**: Firefox temporary add-ons are removed when Firefox closes. You'll need to reload it after restarting Firefox.

---

## 🔗 Step 4: Establish P2P Connection

### 4.1 Choose Your Test Passphrase

For testing, use a strong but memorable passphrase:
```
test-sync-passphrase-2024-secure
```

**Important**: Both browsers MUST use the EXACT same passphrase.

### 4.2 Setup Primary Device (Chrome)

1. **Open Chrome**
2. **Click SynchroPeer extension icon** in toolbar
3. **Enter passphrase**: `test-sync-passphrase-2024-secure`
4. **Select role**: ⚪ **Primary** (First device - listens for connection)
5. **Click**: "Start Connection"

**Expected Behavior**:
- Status dot turns **orange/yellow**
- Status text: "Waiting for peer..."
- Connection indicator shows "Waiting"
- No errors in console

### 4.3 Setup Secondary Device (Firefox)

1. **Open Firefox**
2. **Click SynchroPeer extension icon** in toolbar
3. **Enter passphrase**: `test-sync-passphrase-2024-secure` (EXACT SAME!)
4. **Select role**: ⚪ **Secondary** (Second device - initiates connection)
5. **Click**: "Start Connection"

**Expected Behavior**:
- Status changes to "Connecting..."
- Then quickly to "Connected"
- Status dot turns **green**
- Connection info cards appear
- Sync stats show (0/0/0 initially)

### 4.4 Verify Connection

**Both browsers should show**:
- ✅ Green status dot
- ✅ "Connected" status text
- ✅ Role displayed (Primary/Secondary)
- ✅ "Last Sync: Never" (initially)
- ✅ Sync statistics: 0 bookmarks, 0 history, 0 total syncs
- ✅ "Sync Now" button enabled
- ✅ "Disconnect" button visible

---

## 📚 Step 5: Test Bookmark Synchronization

### 5.1 Create Test Bookmarks in Chrome

1. In Chrome, bookmark these test URLs:
   ```
   https://github.com (GitHub)
   https://mozilla.org (Mozilla)
   https://example.com (Example Domain)
   ```

2. Organize them in a folder called "Test Sync Folder"

3. Open bookmarks manager: `chrome://bookmarks/`
4. Verify they exist

### 5.2 Initiate Sync from Chrome

1. Click SynchroPeer extension icon
2. Click **"Sync Now"** button
3. Watch for status messages

**Expected Behavior**:
- Button shows "Syncing..." with spinner
- Status message: "Initiating sync..."
- After 2-5 seconds: "Sync completed successfully!"
- Stats update: Bookmarks Synced count increases

### 5.3 Verify in Firefox

1. Switch to Firefox
2. Open bookmarks: `Ctrl+Shift+B` or `Cmd+Shift+B`
3. Look for "Test Sync Folder"
4. Verify all 3 bookmarks are present

**Success Criteria**:
- ✅ All bookmarks synced
- ✅ Folder structure preserved
- ✅ Titles match
- ✅ URLs are correct

### 5.4 Test Reverse Sync

1. In Firefox, create a new bookmark:
   ```
   https://firefox.com (Firefox Homepage)
   ```

2. Click SynchroPeer, click **"Sync Now"**

3. Switch to Chrome

4. Verify new bookmark appears in Chrome bookmarks

---

## 🕒 Step 6: Test History Synchronization

### 6.1 Create Test History in Firefox

1. In Firefox, visit these URLs:
   ```
   https://wikipedia.org
   https://stackoverflow.com
   https://reddit.com
   ```

2. Close the tabs (history is now recorded)

3. Verify history exists: `Ctrl+H` or `Cmd+Y`

### 6.2 Sync History

1. Click SynchroPeer extension in Firefox
2. Click **"Sync Now"**
3. Wait for completion

### 6.3 Verify in Chrome

1. Switch to Chrome
2. Open history: `chrome://history/`
3. Look for the 3 URLs visited in Firefox

**Success Criteria**:
- ✅ All visited URLs appear
- ✅ Timestamps are preserved
- ✅ Page titles correct

---

## 🔍 Step 7: Debug and Monitor

### 7.1 Open Browser Console (Chrome)

1. Right-click SynchroPeer extension icon
2. Click **"Inspect popup"** (opens DevTools for popup)
3. Or right-click page → "Inspect" → Click "Console" tab

**For Background Script**:
1. Go to `chrome://extensions/`
2. Find SynchroPeer
3. Click **"Inspect views: background page"**

### 7.2 Open Browser Console (Firefox)

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Find SynchroPeer
3. Click **"Inspect"** button

### 7.3 Monitor Log Messages

Look for these log patterns:

**Connection Logs**:
```
[Background] SynchroPeer initializing...
[Background] Starting P2P as PRIMARY
[Background] Peer ID: sp-abc123...
[Background] Peer opened: sp-abc123...
[Background] Data channel opened
[Background] Connection established
```

**Sync Logs**:
```
[Background] Received: sync-request
[Background] Creating snapshot...
[Background] Encrypting data...
[Background] Data sent: snapshot
[Background] Received: snapshot
[Background] Applying sync...
[Background] Sync results: { bookmarksAdded: 5, historyAdded: 10 }
```

### 7.4 Check for Errors

**Common Issues**:
- ❌ `Peer not available`: Wrong passphrase or role
- ❌ `Connection timeout`: Firewall or network issue
- ❌ `Decryption failed`: Passphrase mismatch
- ❌ `Permission denied`: Browser permissions not granted

---

## 🧪 Step 8: Advanced Testing Scenarios

### 8.1 Test Reconnection

1. While connected, close Chrome completely
2. Reopen Chrome
3. Extension should attempt to reconnect
4. Check if reconnection succeeds

### 8.2 Test Conflict Resolution

1. In Chrome: Edit a bookmark title to "GitHub Main"
2. In Firefox: Edit the SAME bookmark to "GitHub Home"
3. Sync from both sides
4. Last sync should win (Last-Modified-Wins strategy)

### 8.3 Test Large Dataset

1. Import a large bookmark file (100+ bookmarks)
2. Sync and measure time
3. Check if all items synced correctly

### 8.4 Test Encryption

1. Open browser console
2. Watch network traffic during sync
3. Verify data is encrypted (base64 strings, not plain text)

### 8.5 Test Disconnection

1. Click "Disconnect" in either browser
2. Verify both browsers show "Disconnected"
3. Try to sync (should fail with appropriate error)
4. Reconnect and verify sync works again

---

## ✅ Verification Checklist

### Connection Tests
- [ ] Primary device can start listening
- [ ] Secondary device can connect to primary
- [ ] Connection status updates correctly
- [ ] Disconnection works properly
- [ ] Reconnection after network interruption

### Bookmark Sync Tests
- [ ] New bookmarks sync from Chrome to Firefox
- [ ] New bookmarks sync from Firefox to Chrome
- [ ] Bookmark folders are preserved
- [ ] Duplicate bookmarks are handled
- [ ] Bookmark updates sync correctly

### History Sync Tests
- [ ] History items sync from Chrome to Firefox
- [ ] History items sync from Firefox to Chrome
- [ ] Visit counts are preserved
- [ ] Timestamps are accurate
- [ ] Large history datasets sync

### Security Tests
- [ ] Data is encrypted before transmission
- [ ] Wrong passphrase fails gracefully
- [ ] No plain text data in network logs
- [ ] Peer IDs are deterministic from passphrase

### UI/UX Tests
- [ ] Status indicator updates in real-time
- [ ] Sync statistics display correctly
- [ ] Error messages are user-friendly
- [ ] Loading states show during operations
- [ ] Buttons disable appropriately

### Performance Tests
- [ ] Initial sync completes in reasonable time
- [ ] Subsequent syncs are faster (delta sync)
- [ ] No memory leaks during extended use
- [ ] Extension doesn't slow down browser

---

## 🐛 Common Issues and Solutions

### Issue 1: "Peer not available"

**Symptoms**: Connection fails immediately or after timeout

**Solutions**:
1. Verify EXACT same passphrase on both devices
2. Check that roles are different (one Primary, one Secondary)
3. Ensure Primary device started FIRST
4. Wait 30 seconds and try again
5. Check browser console for detailed errors

### Issue 2: "Connection timeout"

**Symptoms**: Connecting state lasts >30 seconds, then fails

**Solutions**:
1. Check firewall settings (allow WebRTC UDP)
2. Try different network (corporate networks may block P2P)
3. Disable VPN temporarily
4. Check if STUN servers are accessible
5. Try from different network location

### Issue 3: Bookmarks not syncing

**Symptoms**: Sync completes but bookmarks don't appear

**Solutions**:
1. Check browser permissions: `chrome://extensions/` → Details → Permissions
2. Verify bookmarks exist on source browser
3. Check console for "Permission denied" errors
4. Reload extension and try again
5. Check if bookmarks are in a synced folder

### Issue 4: History not syncing

**Symptoms**: History sync reports 0 items

**Solutions**:
1. Verify history permission is granted
2. Check if history exists: `chrome://history/`
3. Some browsers limit history API access
4. Try syncing recent history only
5. Check for API errors in console

### Issue 5: "Decryption failed"

**Symptoms**: Sync fails with decryption error

**Solutions**:
1. Verify EXACT same passphrase (case-sensitive!)
2. No spaces before/after passphrase
3. Disconnect and reconnect with correct passphrase
4. Clear browser extension storage
5. Reinstall extension if persists

### Issue 6: Extension not loading

**Symptoms**: Error when loading in browser

**Solutions**:
1. Verify build completed: `npm run build`
2. Check manifest.json exists in dist folder
3. Verify all files copied correctly
4. Rebuild: `npm run clean && npm run build`
5. Check browser console for specific errors

---

## 📊 Performance Benchmarks

### Expected Performance

**Initial Full Sync**:
- 10 bookmarks + 100 history items: ~2-5 seconds
- 100 bookmarks + 1000 history items: ~5-10 seconds
- 500 bookmarks + 5000 history items: ~15-30 seconds

**Delta Sync** (subsequent syncs):
- 1-5 new items: ~1-2 seconds
- 10-20 new items: ~2-4 seconds

**Connection Establishment**:
- Same network: 2-5 seconds
- Different networks: 5-15 seconds
- With restrictive firewall: 15-30 seconds (may fail)

---

## 🔬 Debug Mode

### Enable Verbose Logging

1. Open browser console
2. Type: `localStorage.setItem('DEBUG', 'true')`
3. Reload extension
4. More detailed logs will appear

### Inspect WebRTC Stats

Chrome: `chrome://webrtc-internals/`
Firefox: `about:webrtc`

Look for:
- ICE connection state
- Data channel state
- Bytes sent/received
- Active connections

---

## 📝 Test Report Template

Use this template to document your test results:

```
SynchroPeer Test Report
=======================

Test Date: [DATE]
Tester: [NAME]
Chrome Version: [VERSION]
Firefox Version: [VERSION]
macOS Version: [VERSION]

Connection Tests:
- Primary device connection: [PASS/FAIL]
- Secondary device connection: [PASS/FAIL]
- Connection time: [SECONDS]
- Disconnection: [PASS/FAIL]

Bookmark Sync Tests:
- Chrome → Firefox: [PASS/FAIL] ([COUNT] items)
- Firefox → Chrome: [PASS/FAIL] ([COUNT] items)
- Folder structure: [PASS/FAIL]
- Sync time: [SECONDS]

History Sync Tests:
- Chrome → Firefox: [PASS/FAIL] ([COUNT] items)
- Firefox → Chrome: [PASS/FAIL] ([COUNT] items)
- Sync time: [SECONDS]

Issues Found:
1. [ISSUE DESCRIPTION]
2. [ISSUE DESCRIPTION]

Notes:
[ADDITIONAL OBSERVATIONS]
```

---

## 🎓 Understanding the Architecture

### Data Flow Diagram

```
Chrome (Primary)                    Firefox (Secondary)
================                    ===================

1. User enters passphrase           1. User enters same passphrase
2. Generate Peer ID (hash)          2. Generate Peer ID (hash)
3. Connect to PeerJS server         3. Connect to PeerJS server
4. Listen for connection            4. Connect to Primary peer
                                    
        ↓                                    ↓
        
5. WebRTC connection established
        
        ↓                                    ↓
        
6. Create snapshot                  6. Wait for snapshot
7. Encrypt with AES-256             
8. Send via data channel    →→→→    8. Receive encrypted data
                                    9. Decrypt with same passphrase
                                    10. Merge with local data
                                    11. Send completion message
```

### Key Components

1. **PeerJS**: Simplifies WebRTC connection setup
2. **Web Crypto API**: Provides AES-256-GCM encryption
3. **Browser APIs**: Access bookmarks and history
4. **Background Script**: Orchestrates everything
5. **Popup UI**: User interaction interface

---

## 🚀 Next Steps After Testing

1. **Report Bugs**: Document any issues found
2. **Suggest Features**: Ideas for improvement
3. **Performance Testing**: Test with larger datasets
4. **Cross-Platform**: Test on Windows/Linux
5. **Mobile Testing**: Try Firefox for Android
6. **Security Audit**: Review encryption implementation
7. **Code Review**: Examine source code
8. **Contribute**: Submit pull requests

---

## 📞 Getting Help

If you encounter issues:

1. Check this guide first
2. Review browser console logs
3. Check GitHub Issues
4. Review README.md
5. Open a new issue with:
   - Browser versions
   - Console logs
   - Steps to reproduce
   - Expected vs actual behavior

---

## 🎉 Success!

If all tests pass, you have successfully:

✅ Built a cross-browser extension
✅ Established P2P WebRTC connection
✅ Synchronized bookmarks and history
✅ Encrypted data end-to-end
✅ Verified cross-browser compatibility

**Congratulations! SynchroPeer is working correctly.**

---

*Happy Testing! 🧪*