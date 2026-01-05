# SynchroPeer - Repository Structure Guide

## 📁 Repository Structure (GitHub-Ready)

This repository is organized for **immediate use** - no build step required!

```
SynchroPeer/
│
├── chrome/                          # ✅ READY TO USE - Chrome Extension
│   ├── manifest.json                # Manifest V3
│   ├── background.js                # Main service worker
│   ├── popup.html                   # Extension popup
│   ├── popup.css                    # Popup styling
│   ├── popup.js                     # Popup logic
│   ├── utils/                       # Core utilities
│   │   ├── crypto.js                # AES-256 encryption
│   │   ├── sync-logic.js            # Sync algorithms
│   │   └── p2p-manager.js           # WebRTC P2P
│   ├── lib/                         # External libraries
│   │   └── peerjs.min.js            # PeerJS for WebRTC
│   └── icons/                       # Extension icons
│
├── firefox/                         # ✅ READY TO USE - Firefox Extension
│   ├── manifest.json                # Manifest V2
│   ├── background.js                # Main background script
│   ├── popup.html                   # Extension popup
│   ├── popup.css                    # Popup styling
│   ├── popup.js                     # Popup logic
│   ├── utils/                       # Core utilities
│   │   ├── crypto.js                # AES-256 encryption
│   │   ├── sync-logic.js            # Sync algorithms
│   │   └── p2p-manager.js           # WebRTC P2P
│   ├── lib/                         # External libraries
│   │   ├── peerjs.min.js            # PeerJS for WebRTC
│   │   └── browser-polyfill.min.js  # Firefox polyfill
│   └── icons/                       # Extension icons
│
├── src/                             # 📝 Source code (for developers)
│   ├── background/
│   ├── popup/
│   └── utils/
│
├── icons/                           # 🎨 Source icons
├── node_modules/                    # 📦 Dependencies (gitignored)
├── dist/                            # 🗑️ Old build output (gitignored)
│
├── 📄 Documentation Files
├── README.md                        # Main documentation
├── INSTALL.md                       # Installation guide
├── QUICKSTART.md                    # 5-minute quick start
├── TESTING_GUIDE.md                 # Comprehensive testing
├── ARCHITECTURE.md                  # Technical architecture
├── PROJECT_SUMMARY.md               # Executive summary
├── DEPLOYMENT_CHECKLIST.md          # Store submission guide
├── DOCS_INDEX.md                    # Documentation index
├── COMPLETION_REPORT.md             # Project completion report
├── GITHUB_README.md                 # This file
│
├── ⚙️ Configuration Files
├── manifest.chrome.json             # Chrome manifest template
├── manifest.firefox.json            # Firefox manifest template
├── package.json                     # NPM dependencies
├── build.js                         # Build script
├── generate-icons.js                # Icon generator
└── .gitignore                       # Git ignore rules
```

---

## 🚀 For Users - Quick Install

### Chrome, Edge, Brave, Arc, Helium, or any Chromium browser

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/SynchroPeer.git
   ```

2. Open `chrome://extensions/` in your browser

3. Enable "Developer mode" (top-right toggle)

4. Click "Load unpacked"

5. Select the **`chrome/`** folder from the cloned repository

6. Done! ✅

### Firefox

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/SynchroPeer.git
   ```

2. Open `about:debugging#/runtime/this-firefox`

3. Click "Load Temporary Add-on..."

4. Navigate to the **`firefox/`** folder and select `manifest.json`

5. Done! ✅

---

## 🔧 For Developers - Building from Source

Only needed if you want to modify the code:

### Setup

```bash
# Install dependencies
npm install

# Build both Chrome and Firefox versions
npm run build

# Build specific browser
npm run build:chrome
npm run build:firefox
```

### Output

The build script outputs directly to:
- `chrome/` - Chrome extension (Manifest V3)
- `firefox/` - Firefox extension (Manifest V2)

### Making Changes

1. Edit files in `src/` directory
2. Run `npm run build`
3. Reload extension in browser

---

## 📖 Documentation

| File | Description | Audience |
|------|-------------|----------|
| **README.md** | Main project documentation | Everyone |
| **INSTALL.md** | Installation guide | Users |
| **QUICKSTART.md** | 5-minute setup | New users |
| **TESTING_GUIDE.md** | Testing procedures | Testers |
| **ARCHITECTURE.md** | Technical details | Developers |
| **PROJECT_SUMMARY.md** | Executive summary | Stakeholders |
| **DEPLOYMENT_CHECKLIST.md** | Store submission | Maintainers |

---

## ❓ Why Two Folders (chrome/ and firefox/)?

Different browsers use different manifest versions and APIs:

- **Chrome** uses Manifest V3 with service workers
- **Firefox** uses Manifest V2 with background scripts
- **Firefox** requires browser-polyfill for cross-browser compatibility

By providing pre-built versions, users can:
- ✅ Clone and use immediately
- ✅ No build tools required
- ✅ No npm install needed
- ✅ Just load and go!

---

## 🔒 Security Note

Both `chrome/` and `firefox/` folders contain identical functionality:
- AES-256-GCM encryption
- WebRTC P2P connections
- No cloud storage
- No tracking
- End-to-end encrypted

The only differences are:
- Manifest format (V3 vs V2)
- Browser API compatibility
- Polyfill inclusion (Firefox only)

---

## 📦 Git Tracking

Both `chrome/` and `firefox/` folders ARE tracked in Git because:
1. They allow immediate use without building
2. Users don't need Node.js or npm
3. Perfect for GitHub users who want to try it quickly
4. Developers can still build from `src/` if needed

The `dist/` folder is gitignored (legacy build output).

---

## 🤝 Contributing

1. Fork this repository
2. Make changes in `src/` directory
3. Run `npm run build` to update `chrome/` and `firefox/`
4. Test in both browsers
5. Submit a pull request

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🌟 Star This Repository

If you find SynchroPeer useful, please star this repository!

---

**Your data. Your devices. Your privacy.** 🔒