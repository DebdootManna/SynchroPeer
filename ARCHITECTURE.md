# SynchroPeer - Architecture Documentation

Complete technical architecture and implementation details.

---

## 📐 System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                           │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │ popup.html  │  │  popup.css   │  │    popup.js        │     │
│  │  (UI View)  │  │  (Styling)   │  │ (UI Controller)    │     │
│  └─────────────┘  └──────────────┘  └────────────────────┘     │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Browser Runtime Messages
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Background Script Layer                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            background.js (Main Orchestrator)              │  │
│  │  • Message routing                                        │  │
│  │  • State management                                       │  │
│  │  • P2P coordination                                       │  │
│  │  • Sync orchestration                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────┬─────────────────┬──────────────────┬────────────┘
                │                 │                  │
                ↓                 ↓                  ↓
┌───────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  P2P Manager      │  │  Crypto Manager   │  │  Sync Logic     │
│                   │  │                   │  │                 │
│ • Peer Discovery  │  │ • AES-256-GCM     │  │ • Extraction    │
│ • WebRTC Setup    │  │ • Key Derivation  │  │ • Diffing       │
│ • Data Channel    │  │ • Encryption      │  │ • Merging       │
│ • Heartbeat       │  │ • Decryption      │  │ • Conflict Res  │
└─────────┬─────────┘  └──────────┬───────┘  └────────┬────────┘
          │                       │                     │
          ↓                       ↓                     ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Browser APIs Layer                          │
│  ┌────────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐  │
│  │  WebRTC    │  │  Crypto  │  │ Storage │  │  Bookmarks   │  │
│  │    API     │  │   API    │  │   API   │  │  & History   │  │
│  └────────────┘  └──────────┘  └─────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Components

### 1. Background Script (`background.js`)

**Purpose**: Main orchestrator and service worker

**Responsibilities**:
- Initialize extension on startup
- Manage P2P connection lifecycle
- Route messages between popup and P2P layer
- Orchestrate sync operations
- Handle encryption/decryption
- Manage browser API interactions

**Key Functions**:
```javascript
initialize()                    // Setup on extension load
startP2PConnection()           // Establish peer connection
generatePeerID()               // Create deterministic peer ID
handleIncomingMessage()        // Process P2P messages
initiateSync()                 // Start sync operation
createSnapshot()               // Extract bookmarks/history
applySnapshot()                // Apply received data
encryptData() / decryptData()  // Crypto operations
```

**State Management**:
```javascript
{
  isInitialized: boolean,
  isPrimary: boolean,
  passphrase: string,
  peer: PeerJS.Peer,
  connection: PeerJS.DataConnection,
  connectionState: string,
  lastSyncTime: timestamp,
  syncInProgress: boolean,
  stats: {
    totalBookmarksSynced: number,
    totalHistorySynced: number,
    lastSyncDuration: number,
    syncCount: number
  }
}
```

---

### 2. P2P Manager (`utils/p2p-manager.js`)

**Purpose**: WebRTC connection management using PeerJS

**Architecture Pattern**: Singleton

**Core Features**:
- Deterministic peer ID generation from passphrase
- Primary/Secondary role logic
- Connection establishment and maintenance
- Heartbeat mechanism for connection health
- Automatic reconnection with exponential backoff
- Message routing and handling

**Connection Flow**:
```
Primary Device:
1. Generate Peer ID (hash of passphrase + "-primary")
2. Initialize PeerJS with ID
3. Listen for incoming connections
4. Accept connection from Secondary
5. Setup data channel handlers

Secondary Device:
1. Generate Peer ID (hash of passphrase + "-secondary")
2. Initialize PeerJS with ID
3. Generate Primary's Peer ID
4. Initiate connection to Primary
5. Setup data channel handlers
```

**Peer ID Generation**:
```javascript
async generatePeerID(passphrase, isPrimary) {
  const suffix = isPrimary ? '-primary' : '-secondary'
  const data = encode(passphrase + suffix)
  const hash = await SHA-256(data)
  return 'sp-' + hash.substring(0, 28)
}
```

**WebRTC Configuration**:
```javascript
{
  host: '0.peerjs.com',        // Public signaling server
  port: 443,
  secure: true,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
}
```

**Message Types**:
- `handshake`: Initial connection acknowledgment
- `sync-request`: Request peer's snapshot
- `snapshot`: Encrypted data payload
- `sync-complete`: Sync finished notification
- `heartbeat`: Connection health check
- `heartbeat-ack`: Heartbeat response

---

### 3. Crypto Manager (`utils/crypto.js`)

**Purpose**: AES-256-GCM encryption with PBKDF2 key derivation

**Security Specifications**:
- Algorithm: AES-256-GCM (Galois/Counter Mode)
- Key Length: 256 bits
- IV Length: 96 bits (12 bytes)
- Salt Length: 128 bits (16 bytes)
- KDF: PBKDF2 with SHA-256
- Iterations: 100,000

**Encryption Process**:
```
User Passphrase
      ↓
PBKDF2(passphrase, salt, 100k iterations, SHA-256)
      ↓
AES-256 Key (256 bits)
      ↓
Encrypt(data, key, random_iv)
      ↓
Output: [salt][iv][ciphertext]
      ↓
Base64 Encode for transmission
```

**Key Derivation**:
```javascript
async deriveKey(passphrase, salt) {
  // Import passphrase as raw key material
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
```

**Data Format**:
```
Encrypted Payload Structure:
┌────────────┬────────────┬──────────────────┐
│ Salt (16B) │ IV (12B)   │ Ciphertext (var) │
└────────────┴────────────┴──────────────────┘
         ↓
   Base64 Encoded String
```

---

### 4. Sync Logic (`utils/sync-logic.js`)

**Purpose**: Data extraction, diffing, and conflict resolution

**Key Operations**:

#### 4.1 Data Extraction

**Bookmarks**:
```javascript
extractBookmarks() {
  // Get tree structure from browser
  const tree = await browser.bookmarks.getTree()
  
  // Flatten into array with metadata
  return flatBookmarks = [
    {
      id: string,
      parentId: string,
      title: string,
      url: string | null,
      type: 'bookmark' | 'folder',
      path: string[],
      dateAdded: timestamp,
      dateGroupModified: timestamp
    },
    ...
  ]
}
```

**History**:
```javascript
extractHistory(maxItems = 5000) {
  const items = await browser.history.search({
    text: '',
    maxResults: maxItems,
    startTime: 0
  })
  
  return items.map(item => ({
    url: string,
    title: string,
    visitCount: number,
    lastVisitTime: timestamp
  }))
}
```

#### 4.2 Snapshot Creation

```javascript
Snapshot Structure:
{
  timestamp: number,
  bookmarks: BookmarkItem[],
  history: HistoryItem[],
  bookmarkCount: number,
  historyCount: number
}
```

#### 4.3 Conflict Resolution Strategy

**Last-Modified-Wins (LMW)**:
```javascript
For bookmarks:
  if remote.dateModified > local.dateModified:
    accept remote version
  else:
    keep local version

For history:
  if remote.lastVisitTime > local.lastVisitTime:
    update with remote
    visitCount = max(remote, local)
```

#### 4.4 Delta Calculation

```javascript
calculateDelta(localSnapshot, remoteSnapshot) {
  return {
    bookmarksToAdd: [],      // New bookmarks from remote
    bookmarksToUpdate: [],   // Modified bookmarks
    historyToAdd: []         // New history items
  }
}
```

#### 4.5 Data Merging

**Bookmark Merging**:
1. Create lookup map of local bookmarks (by URL or path)
2. For each remote bookmark:
   - If not exists locally: add
   - If exists but older: update
   - If exists and newer: skip
3. Preserve folder structure
4. Handle duplicates

**History Merging**:
1. Create lookup map of local history (by URL)
2. For each remote history item:
   - If not exists: add
   - If exists with older visit time: update
   - Merge visit counts (use maximum)

---

### 5. Popup UI (`popup.html`, `popup.css`, `popup.js`)

**Purpose**: User interface for extension control

**Components**:

#### 5.1 Setup Section
- Passphrase input field
- Role selection (Primary/Secondary)
- Connection button
- Info box with instructions

#### 5.2 Connected Section
- Connection status cards
- Sync statistics display
- Sync Now button
- Disconnect button
- Status messages

#### 5.3 Loading Section
- Spinner animation
- Loading status text

**State Management**:
```javascript
UIState {
  isConnected: boolean,
  isPrimary: boolean,
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error',
  lastSyncTime: timestamp,
  stats: {
    bookmarksSynced: number,
    historySynced: number,
    syncCount: number
  }
}
```

**Message Flow**:
```
Popup → Background:
- start-connection
- disconnect
- sync-now
- get-status

Background → Popup:
- connection-state-change
- sync-progress
- sync-complete
```

---

## 🔄 Data Flow

### Complete Sync Operation Flow

```
Step 1: User Initiates Sync
┌─────────────────┐
│ User clicks     │
│ "Sync Now"      │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────┐
│ Popup sends 'sync-now' message  │
└────────┬────────────────────────┘
         │
         ↓

Step 2: Background Orchestrates
┌──────────────────────────────────┐
│ Background receives message      │
│ - Checks connection status       │
│ - Creates local snapshot         │
│ - Extracts bookmarks & history   │
└────────┬─────────────────────────┘
         │
         ↓

Step 3: Encryption
┌──────────────────────────────────┐
│ Crypto Manager encrypts          │
│ - Generate random salt & IV      │
│ - Derive key from passphrase     │
│ - Encrypt snapshot with AES-256  │
│ - Output: base64 string          │
└────────┬─────────────────────────┘
         │
         ↓

Step 4: P2P Transmission
┌──────────────────────────────────┐
│ Send via WebRTC Data Channel     │
│ - Message type: 'snapshot'       │
│ - Payload: encrypted data        │
│ - Reliable transport             │
└────────┬─────────────────────────┘
         │
         ↓

Step 5: Remote Reception
┌──────────────────────────────────┐
│ Peer receives 'snapshot' message │
│ - Validates message structure    │
│ - Extracts encrypted payload     │
└────────┬─────────────────────────┘
         │
         ↓

Step 6: Decryption
┌──────────────────────────────────┐
│ Crypto Manager decrypts          │
│ - Extract salt and IV            │
│ - Derive same key from passphrase│
│ - Decrypt ciphertext             │
│ - Parse JSON snapshot            │
└────────┬─────────────────────────┘
         │
         ↓

Step 7: Data Merging
┌──────────────────────────────────┐
│ Sync Logic merges data           │
│ - Compare with local snapshot    │
│ - Calculate delta                │
│ - Apply conflict resolution      │
│ - Update bookmarks               │
│ - Update history                 │
└────────┬─────────────────────────┘
         │
         ↓

Step 8: Completion
┌──────────────────────────────────┐
│ Update stats and notify          │
│ - Increment sync counter         │
│ - Update last sync time          │
│ - Send 'sync-complete' message   │
│ - Update UI                      │
└──────────────────────────────────┘
```

---

## 🔐 Security Architecture

### Threat Model

**Protected Against**:
- ✅ Man-in-the-middle attacks (encrypted channel)
- ✅ Eavesdropping (AES-256-GCM encryption)
- ✅ Data tampering (GCM authentication tag)
- ✅ Replay attacks (random IV per message)
- ✅ Brute force (100k PBKDF2 iterations)

**Not Protected Against**:
- ❌ Weak passphrases (user responsibility)
- ❌ Compromised device (local access)
- ❌ Keyloggers (device-level threat)
- ❌ Phishing (social engineering)

### Security Layers

**Layer 1: Transport Security**
- WebRTC with DTLS-SRTP
- Encrypted peer-to-peer channel
- Perfect Forward Secrecy (PFS)

**Layer 2: Application Encryption**
- AES-256-GCM (authenticated encryption)
- Random salt and IV per encryption
- PBKDF2 key derivation (100k iterations)

**Layer 3: Identity Privacy**
- Peer IDs derived from passphrase hash
- No personally identifiable information
- Ephemeral signaling (only for handshake)

**Layer 4: Data Minimization**
- No data stored on servers
- No telemetry or analytics
- No third-party tracking

### Encryption Flow Detail

```
Plaintext Data (JSON)
         ↓
  JSON.stringify()
         ↓
  UTF-8 Encoding
         ↓
┌────────────────────────────┐
│   PBKDF2 Key Derivation    │
│                            │
│ Input:  Passphrase         │
│ Salt:   Random 128-bit     │
│ Iter:   100,000            │
│ Hash:   SHA-256            │
│ Output: 256-bit key        │
└─────────┬──────────────────┘
          ↓
┌────────────────────────────┐
│   AES-256-GCM Encryption   │
│                            │
│ Key:    Derived key        │
│ IV:     Random 96-bit      │
│ Input:  UTF-8 bytes        │
│ Output: Ciphertext + Tag   │
└─────────┬──────────────────┘
          ↓
┌────────────────────────────┐
│   Packaging                │
│                            │
│ [Salt][IV][Ciphertext+Tag] │
└─────────┬──────────────────┘
          ↓
    Base64 Encode
          ↓
  Transmission Ready
```

---

## 🌐 Network Architecture

### Connection Establishment

```
Device A (Primary)          Signaling Server         Device B (Secondary)
      │                            │                         │
      │  1. Register(ID_A)         │                         │
      ├───────────────────────────>│                         │
      │                            │                         │
      │  2. OK                     │                         │
      │<───────────────────────────┤                         │
      │                            │                         │
      │  3. Listen for connections │                         │
      │                            │                         │
      │                            │   4. Register(ID_B)     │
      │                            │<────────────────────────┤
      │                            │                         │
      │                            │   5. OK                 │
      │                            ├────────────────────────>│
      │                            │                         │
      │                            │   6. Connect to ID_A    │
      │                            │<────────────────────────┤
      │                            │                         │
      │  7. Forward SDP Offer      │                         │
      │<───────────────────────────┤                         │
      │                            │                         │
      │  8. Send SDP Answer        │                         │
      ├───────────────────────────>│                         │
      │                            │                         │
      │                            │   9. Forward SDP Answer │
      │                            ├────────────────────────>│
      │                            │                         │
      │  10. ICE Candidates Exchange via Signaling           │
      │<─────────────────────────────────────────────────────>│
      │                            │                         │
      │  11. Direct P2P Connection Established (WebRTC)      │
      │<═════════════════════════════════════════════════════>│
      │                            │                         │
      │  12. Data Channel Opened                             │
      │<─────────────────────────────────────────────────────>│
      │                            │                         │
      │  13. Application Data (Encrypted)                    │
      │<══════════════════════════════════════════════════════>│
      │            No longer using signaling server          │
```

**Key Points**:
1. Signaling server used ONLY for initial handshake
2. Actual data transfer is direct peer-to-peer
3. Signaling server never sees encrypted data
4. ICE candidates help with NAT traversal
5. STUN servers assist in finding public IP/port

### NAT Traversal

**STUN (Session Traversal Utilities for NAT)**:
- Discovers public IP address
- Determines NAT type
- Multiple STUN servers for reliability

**ICE (Interactive Connectivity Establishment)**:
- Tries direct connection first
- Falls back to STUN-assisted connection
- Uses multiple candidates in parallel

---

## 📁 File Structure

```
SynchroPeer/
│
├── src/                              # Source code
│   ├── background/
│   │   └── background.js             # Main background script (885 lines)
│   │
│   ├── popup/
│   │   ├── popup.html                # UI structure (169 lines)
│   │   ├── popup.css                 # Styling (586 lines)
│   │   └── popup.js                  # UI logic (451 lines)
│   │
│   └── utils/
│       ├── crypto.js                 # Encryption utilities (199 lines)
│       ├── sync-logic.js             # Sync algorithms (433 lines)
│       └── p2p-manager.js            # P2P connection (473 lines)
│
├── icons/                            # Extension icons
│   ├── icon16.png/svg
│   ├── icon32.png/svg
│   ├── icon48.png/svg
│   └── icon128.png/svg
│
├── dist/                             # Build output (generated)
│   ├── chrome/                       # Chrome MV3 build
│   └── firefox/                      # Firefox MV2 build
│
├── manifest.chrome.json              # Chrome Manifest V3
├── manifest.firefox.json             # Firefox Manifest V2
├── build.js                          # Build script
├── generate-icons.js                 # Icon generator
├── package.json                      # Dependencies
│
├── README.md                         # Main documentation
├── QUICKSTART.md                     # Quick start guide
├── TESTING_GUIDE.md                  # Comprehensive testing
└── ARCHITECTURE.md                   # This file

Total Lines of Code: ~3,000+
```

---

## 🔧 Build System

### Build Process

```javascript
// build.js
1. Clean dist directory
2. For each browser (chrome, firefox):
   a. Create dist/{browser} directory
   b. Copy appropriate manifest.json
   c. Copy source files (background, popup, utils)
   d. Copy icons
   e. Copy lib directory (PeerJS, polyfill)
   f. For Firefox: Include browser-polyfill
3. Report success
```

### Manifest Differences

**Chrome (Manifest V3)**:
```json
{
  "manifest_version": 3,
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": { ... }
}
```

**Firefox (Manifest V2)**:
```json
{
  "manifest_version": 2,
  "background": {
    "scripts": ["lib/browser-polyfill.min.js", "background.js"],
    "persistent": false
  },
  "browser_action": { ... }
}
```

---

## 🎯 Design Patterns

### 1. Singleton Pattern
- `CryptoManager`: Single encryption instance
- `SyncLogic`: Single sync logic instance
- `P2PManager`: Single connection manager

### 2. Observer Pattern
- Background script listens for popup messages
- Popup listens for background state changes
- P2P manager notifies state changes

### 3. State Machine Pattern
```
Connection States:
disconnected → connecting → waiting → connected
     ↑              ↓           ↓         ↓
     └──────────────┴───────────┴─────────┘
              (error or disconnect)
```

### 4. Strategy Pattern
- Conflict resolution strategies (LMW implemented)
- Encryption algorithms (AES-256-GCM)
- Transport mechanisms (WebRTC)

---

## 📊 Performance Considerations

### Time Complexity

**Bookmark Extraction**: O(n) - Tree traversal
**History Extraction**: O(n) - Linear scan
**Delta Calculation**: O(n + m) - Two snapshots comparison
**Data Merging**: O(n) - With hash map lookups

### Space Complexity

**Memory Usage**:
- Snapshot storage: O(n) where n = total items
- Encryption overhead: ~30 bytes + ciphertext
- Connection state: O(1) constant
- Total: ~10-50 MB for typical usage

### Optimization Strategies

1. **Delta Sync**: Only send changes after initial sync
2. **Lazy Loading**: Load data on-demand
3. **Compression**: Consider gzip for large payloads (future)
4. **Batching**: Group small updates (future)
5. **Caching**: Cache snapshots to avoid re-extraction

---

## 🧪 Testing Strategy

### Unit Tests (Future)
- Crypto operations (encrypt/decrypt)
- Peer ID generation
- Delta calculation
- Conflict resolution

### Integration Tests
- P2P connection establishment
- End-to-end sync
- Cross-browser compatibility
- Error handling

### Manual Testing
- See TESTING_GUIDE.md for comprehensive manual tests
- Chrome ↔ Firefox testing
- Large dataset performance
- Network interruption recovery

---

## 🚀 Future Enhancements

### Phase 2: Advanced Features
- [ ] Multi-peer mesh network (3+ devices)
- [ ] Selective sync (choose folders)
- [ ] Automatic sync intervals
- [ ] Sync conflict UI
- [ ] Delta compression

### Phase 3: Enhanced Security
- [ ] Manual SDP exchange (100% serverless)
- [ ] Custom signaling server option
- [ ] Key rotation
- [ ] Passphrase strength meter
- [ ] Two-factor authentication

### Phase 4: Better UX
- [ ] Sync history timeline
- [ ] Detailed sync logs
- [ ] Bandwidth usage stats
- [ ] Mobile browser support
- [ ] Dark mode

### Phase 5: Optimization
- [ ] Data compression (gzip/brotli)
- [ ] Incremental sync
- [ ] Background sync
- [ ] Sync queue management
- [ ] Connection pooling

---

## 📚 References

### Standards & Specifications
- [WebRTC API](https://www.w3.org/TR/webrtc/)
- [Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/)
- [Browser Extensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)

### Libraries
- [PeerJS](https://peerjs.com/) - WebRTC abstraction
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) - Cross-browser compatibility

### Cryptography
- [NIST AES-GCM](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [RFC 8018 PBKDF2](https://tools.ietf.org/html/rfc8018)
- [RFC 7539 ChaCha20-Poly1305](https://tools.ietf.org/html/rfc7539) (alternative)

---

## 🤝 Contributing

### Code Style
- Use camelCase for variables/functions
- Use PascalCase for classes
- Add JSDoc comments for public functions
- Keep functions small and focused
- Prefer async/await over callbacks

### Git Workflow
```
1. Fork repository
2. Create feature branch: git checkout -b feature/name
3. Make changes with clear commits
4. Test on Chrome and Firefox
5. Submit pull request with description
```

---

## 📄 License

MIT License - Free for personal and commercial use

---

**Version**: 1.0.0  
**Last Updated**: January 2024  
**Author**: SynchroPeer Team

---

*This architecture document represents the current state of SynchroPeer. As the project evolves, this documentation will be updated to reflect new features and improvements.*