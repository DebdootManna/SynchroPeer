# SynchroPeer

**Pure P2P Browser Extension for Synchronizing Bookmarks and History**

No Cloud • No Server • Just You • End-to-End Encrypted

---

## ⚡ Quick Start (Just Cloned from GitHub?)

**No build required!** The extension is ready to use:

### Chrome / Edge / Brave / Arc
1. Open `chrome://extensions/`
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select the **`chrome/`** folder from this repository
5. Done! 🎉

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select **`firefox/manifest.json`** from this repository
4. Done! 🎉

**Now jump to [Testing & Usage](#-developer-test-guide) to connect and sync!**

---

## 🚀 Overview

SynchroPeer is a cross-browser extension that synchronizes your browsing history and bookmarks between any two browsers using a pure peer-to-peer (P2P) architecture. No cloud storage, no servers, no tracking—just direct, encrypted communication between your devices.

### Key Features

- ✅ **Pure P2P Architecture**: Direct WebRTC data channels between browsers
- 🔒 **End-to-End Encryption**: AES-256-GCM encryption for all data
- 🌐 **Cross-Browser**: Works on Chrome, Firefox, Edge, Brave, Arc, and more
- 📚 **Sync Everything**: Bookmarks and browsing history
- 🔑 **Passphrase-Based Discovery**: No accounts, no registration
- 🚫 **No Cloud Storage**: All data stays on your devices
- ⚡ **Real-Time Sync**: Instant synchronization when connected
- 🛡️ **Privacy First**: No telemetry, no tracking, open source

---

## 🏗️ Architecture

### Core Components

1. **P2P Engine** (`background.js`)
   - WebRTC Data Channel management using PeerJS
   - Deterministic peer ID generation from passphrase
   - Primary/Secondary role logic for connection establishment

2. **Encryption Layer** (`utils/crypto.js`)
   - AES-256-GCM encryption/decryption
   - PBKDF2 key derivation (100,000 iterations)
   - Secure passphrase handling

3. **Sync Logic** (`utils/sync-logic.js`)
   - Bookmark and history extraction
   - Last-Modified-Wins conflict resolution
   - Delta-based synchronization after initial full sync

4. **User Interface** (`popup.html`, `popup.js`, `popup.css`)
   - Modern, intuitive design
   - Real-time connection status
   - Sync statistics and controls

### How It Works

1. **Connection Establishment**:
   - User enters a secret passphrase on both devices
   - Extension generates deterministic peer IDs from the passphrase
   - Primary device listens, Secondary device connects via WebRTC
   - PeerJS signaling server used only for initial handshake

2. **Data Synchronization**:
   - Local bookmarks and history are extracted
   - Data is encrypted with AES-256 using the passphrase
   - Encrypted data is sent over the P2P connection
   - Receiving device decrypts and merges data
   - Conflicts resolved using last-modified-wins strategy

3. **Security**:
   - All data encrypted before transmission
   - Passphrase never leaves the device
   - No data stored on intermediary servers
   - WebRTC provides secure peer-to-peer channel

---

## 📦 Installation

### Prerequisites

- Node.js 14+ (for building)
- npm or yarn
- Chrome 88+ / Firefox 91+ / Edge 88+

### Quick Start (No Build Required!)

**For most users, you don't need to build anything!** Just clone and load:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/DebdootManna/SynchroPeer.git
   cd SynchroPeer
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome/` folder

3. **Load in Firefox**:
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select `firefox/manifest.json`

### Building from Source (Optional)

Only needed if you want to modify the code:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the extension**:
   ```bash
   npm run build
   ```

3. **Output**:
   - Chrome version: `chrome/`
   - Firefox version: `firefox/`

---

## 🧪 Developer Test Guide

### Testing Between Chrome and Firefox on Mac

#### Step 1: Load in Chrome

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR-USERNAME/SynchroPeer.git
   cd SynchroPeer
   ```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the `chrome/` folder from the repository
6. The SynchroPeer extension should appear in your toolbar

#### Step 2: Load in Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Navigate to the repository's `firefox/` folder and select `manifest.json`
4. The extension will load temporarily (until Firefox restarts)

#### Step 3: Establish Connection

**On Chrome (Primary Device)**:
1. Click the SynchroPeer extension icon
2. Enter a strong passphrase (e.g., `my-super-secret-sync-key-2024`)
3. Select **Primary** role
4. Click **Start Connection**
5. Status should change to "Waiting for peer..."

**On Firefox (Secondary Device)**:
1. Click the SynchroPeer extension icon
2. Enter the **exact same passphrase**
3. Select **Secondary** role
4. Click **Start Connection**
5. Status should change to "Connecting..." then "Connected"

#### Step 4: Test Synchronization

1. Once connected, click **Sync Now** on either device
2. Wait for sync to complete (status message will appear)
3. Check your bookmarks and history on both browsers
4. Verify that data has been synchronized

#### Step 5: Verify Encryption

1. Open browser console (F12)
2. Look for `[Background]` log messages
3. Data transmitted should be encrypted (base64 strings)
4. No plain text should be visible in network logs

---

## 🔧 Troubleshooting

### Connection Issues

**Problem**: "Peer not available" error
- **Solution**: Ensure both devices entered the exact same passphrase
- **Solution**: Check that you selected different roles (Primary vs Secondary)
- **Solution**: Wait 30 seconds and try again (signaling server may be slow)

**Problem**: "Connection timeout"
- **Solution**: Check firewall settings (WebRTC needs UDP ports)
- **Solution**: Ensure both browsers have network connectivity
- **Solution**: Try using a VPN if behind restrictive firewall

**Problem**: "Signaling server error"
- **Solution**: Default PeerJS server may be down, wait and retry
- **Solution**: Check browser console for detailed error messages

### Sync Issues

**Problem**: Bookmarks not syncing
- **Solution**: Check browser permissions (ensure "bookmarks" permission is granted)
- **Solution**: Verify data exists on source browser
- **Solution**: Look for error messages in browser console

**Problem**: History not syncing
- **Solution**: Check that history permission is granted
- **Solution**: Some browsers limit history access for privacy
- **Solution**: Try syncing a smaller subset first

### Performance Issues

**Problem**: Sync is slow
- **Solution**: Initial sync can take time with large datasets (5000+ items)
- **Solution**: Subsequent syncs use delta algorithm and are faster
- **Solution**: Consider limiting history items in code (default: 5000)

---

## 🔐 Security Considerations

### Encryption

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **Salt**: Random 128-bit salt per encryption
- **IV**: Random 96-bit initialization vector per encryption

### Passphrase Recommendations

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Unique passphrase for SynchroPeer
- Never share or reuse from other services

### Network Security

- WebRTC provides encrypted peer-to-peer channel (DTLS-SRTP)
- Signaling server only sees peer IDs (derived from passphrase hash)
- No plaintext data transmitted
- STUN servers only used for NAT traversal

---

## 📊 Limitations

### Current Limitations

1. **Two Devices Only**: Currently supports only peer-to-peer (1-to-1)
2. **Active Connection Required**: Both browsers must be open simultaneously
3. **Signaling Dependency**: Initial handshake requires PeerJS signaling server
4. **No Conflict Resolution UI**: Uses automatic last-modified-wins strategy
5. **History Limit**: Default 5000 history items per sync (configurable)

### Browser-Specific Limitations

- **Firefox Mobile**: Limited background script execution
- **Safari**: Not yet supported (requires Manifest V2/V3 adaptation)
- **Chrome Mobile**: Extension support limited

---

## 🛣️ Roadmap

- [ ] Multi-device mesh network support (more than 2 peers)
- [ ] Manual SDP copy-paste fallback (100% serverless)
- [ ] Custom signaling server option
- [ ] Selective sync (choose which folders/history to sync)
- [ ] Automatic background sync intervals
- [ ] Sync conflict resolution UI
- [ ] Safari support
- [ ] Mobile browser support (Firefox Android)
- [ ] Sync statistics and analytics
- [ ] Import/export sync configuration

---

## 📁 Project Structure

```
SynchroPeer/
├── chrome/                          # 👈 Chrome extension (ready to load!)
│   ├── manifest.json               # Chrome Manifest V3
│   ├── background.js               # Main background service worker
│   ├── popup.html/css/js           # UI files
│   ├── utils/                      # Crypto, sync, P2P modules
│   ├── lib/                        # PeerJS library
│   └── icons/                      # Extension icons
│
├── firefox/                         # 👈 Firefox extension (ready to load!)
│   ├── manifest.json               # Firefox Manifest V2
│   ├── background.js               # Main background script
│   ├── popup.html/css/js           # UI files
│   ├── utils/                      # Crypto, sync, P2P modules
│   ├── lib/                        # PeerJS + browser-polyfill
│   └── icons/                      # Extension icons
│
├── src/                             # Source code (for development)
│   ├── background/
│   │   └── background.js           # Main orchestrator
│   ├── popup/
│   │   ├── popup.html              # Popup UI
│   │   ├── popup.css               # Popup styles
│   │   └── popup.js                # Popup logic
│   └── utils/
│       ├── crypto.js               # Encryption utilities
│       ├── sync-logic.js           # Sync algorithms
│       └── p2p-manager.js          # P2P connection manager
│
├── icons/                           # Source icons
├── manifest.chrome.json            # Chrome manifest template
├── manifest.firefox.json           # Firefox manifest template
├── build.js                        # Build script (outputs to chrome/ and firefox/)
├── package.json                    # Dependencies
├── README.md                       # This file
├── QUICKSTART.md                   # 5-minute setup guide
├── TESTING_GUIDE.md                # Comprehensive testing
├── ARCHITECTURE.md                 # Technical documentation
└── ... (more docs)
```

**Note**: The `chrome/` and `firefox/` folders contain ready-to-use extensions. Just load them directly in your browser - no build step required!

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add comments for complex logic
- Test on both Chrome and Firefox
- Update README if adding features

---

## 📜 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

- **PeerJS**: Simplified WebRTC implementation
- **Web Crypto API**: Browser-native encryption
- **webextension-polyfill**: Cross-browser compatibility

---

## 📧 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues first
- Provide browser version and error logs

---

## ⚠️ Disclaimer

This extension is provided as-is for educational and personal use. While we implement strong encryption and security best practices, users are responsible for:
- Choosing strong passphrases
- Understanding P2P technology risks
- Backing up important data
- Complying with applicable laws

**Use at your own risk. No warranty provided.**

---

## 🌟 Why SynchroPeer?

In an age of cloud services and data collection, SynchroPeer represents a return to user-controlled, privacy-first technology. Your data never touches a server, is never stored remotely, and is always under your control.

**Your data. Your devices. Your privacy.**

---

Made with ❤️ for privacy-conscious users everywhere.