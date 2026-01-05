# Installation Guide

## 🚀 Quick Install (No Build Required!)

The extension is pre-built and ready to use directly from this repository.

---

## For Chrome, Edge, Brave, or Arc

1. **Clone or Download this repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/SynchroPeer.git
   cd SynchroPeer
   ```

2. **Open Extensions Page**
   - Open your browser
   - Navigate to: `chrome://extensions/`
   - Or click: **Menu** → **Extensions** → **Manage Extensions**

3. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

4. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to the repository folder
   - Select the **`chrome/`** folder
   - Click "Select Folder" / "Open"

5. **Pin to Toolbar (Optional)**
   - Click the puzzle piece icon (Extensions) in toolbar
   - Find "SynchroPeer"
   - Click the pin icon to pin it

✅ **Done!** SynchroPeer is now installed.

---

## For Firefox

1. **Clone or Download this repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/SynchroPeer.git
   cd SynchroPeer
   ```

2. **Open Debugging Page**
   - Open Firefox
   - Navigate to: `about:debugging#/runtime/this-firefox`
   - Or type `about:debugging` and click "This Firefox" in sidebar

3. **Load Temporary Add-on**
   - Click "Load Temporary Add-on..." button
   - Navigate to the repository folder
   - Go into the **`firefox/`** folder
   - Select **`manifest.json`**
   - Click "Open"

4. **Access Extension**
   - Click the puzzle piece icon in toolbar
   - Find "SynchroPeer" and click it

✅ **Done!** SynchroPeer is now installed.

⚠️ **Note**: Firefox temporary add-ons are removed when Firefox restarts. You'll need to reload them each time you open Firefox.

---

## Next Steps

After installation, see:
- **[QUICKSTART.md](QUICKSTART.md)** - Connect two browsers in 5 minutes
- **[README.md](README.md)** - Full documentation and features
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing procedures

---

## Troubleshooting

### "Manifest file is missing or unreadable"
- Make sure you selected the **`chrome/`** folder (for Chrome-based browsers)
- Or the **`firefox/manifest.json`** file (for Firefox)
- Not the root `SynchroPeer/` folder

### "Failed to load extension"
- Verify you have the latest browser version
- Chrome: Version 88 or higher
- Firefox: Version 91 or higher

### Extension not appearing
- Check that Developer Mode is enabled (Chrome)
- Verify the extension loaded successfully (check for errors)
- Refresh the extensions page

### Need to modify the code?
If you want to customize SynchroPeer:

1. Make changes in the `src/` folder
2. Install dependencies: `npm install`
3. Rebuild: `npm run build`
4. Reload extension in browser

---

## Folder Structure

```
SynchroPeer/
├── chrome/          ← Load this folder in Chrome/Edge/Brave
├── firefox/         ← Load manifest.json from here in Firefox
├── src/             ← Source code (for developers)
└── ... (documentation files)
```

---

## Permissions Explained

SynchroPeer requires these permissions:

- **bookmarks**: To read and sync your bookmarks
- **history**: To read and sync your browsing history
- **storage**: To store extension settings and sync state
- **unlimitedStorage**: To handle large bookmark/history datasets
- **<all_urls>**: For WebRTC connection establishment (P2P only, no data sent to servers)

All data is encrypted end-to-end. Nothing is stored in the cloud.

---

## Support

Having issues? Check:
1. [README.md](README.md) - Full documentation
2. [QUICKSTART.md](QUICKSTART.md) - Quick setup guide
3. [TESTING_GUIDE.md](TESTING_GUIDE.md) - Detailed testing
4. GitHub Issues - Report bugs or ask questions

---

**Ready to sync? Follow [QUICKSTART.md](QUICKSTART.md) to get started!** 🚀