/**
 * SynchroPeer - P2P Connection Manager
 * Handles WebRTC peer connections using PeerJS
 */

class P2PManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.peerId = null;
    this.passphrase = null;
    this.isPrimary = false;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;
    this.lastHeartbeat = null;
  }

  /**
   * Initialize P2P connection
   * @param {string} passphrase - User's secret passphrase
   * @param {boolean} isPrimary - Whether this is the primary (listening) peer
   * @param {Object} options - Additional PeerJS options
   * @returns {Promise<void>}
   */
  async initialize(passphrase, isPrimary = false, options = {}) {
    try {
      this.passphrase = passphrase;
      this.isPrimary = isPrimary;

      // Generate deterministic peer ID from passphrase
      this.peerId = await this.generatePeerID(passphrase, isPrimary);

      console.log(`[P2P] Initializing as ${isPrimary ? 'PRIMARY' : 'SECONDARY'} with ID: ${this.peerId}`);

      // Default PeerJS configuration
      const peerConfig = {
        host: options.host || '0.peerjs.com',
        port: options.port || 443,
        path: options.path || '/',
        secure: true,
        debug: options.debug || 2,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      };

      // Initialize PeerJS
      if (typeof Peer !== 'undefined') {
        this.peer = new Peer(this.peerId, peerConfig);
      } else {
        throw new Error('PeerJS library not loaded');
      }

      // Setup peer event handlers
      this.setupPeerEvents();

      // Wait for peer to be ready
      await this.waitForPeerReady();

      // If secondary, connect to primary
      if (!isPrimary) {
        const primaryPeerId = await this.generatePeerID(passphrase, true);
        await this.connectToPeer(primaryPeerId);
      }

      console.log('[P2P] Initialization complete');
    } catch (error) {
      console.error('[P2P] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Generate deterministic peer ID from passphrase
   * @param {string} passphrase
   * @param {boolean} isPrimary
   * @returns {Promise<string>}
   */
  async generatePeerID(passphrase, isPrimary) {
    const encoder = new TextEncoder();
    const suffix = isPrimary ? '-primary' : '-secondary';
    const data = encoder.encode(passphrase + suffix);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return 'sp-' + hashHex.substring(0, 28);
  }

  /**
   * Setup PeerJS event handlers
   */
  setupPeerEvents() {
    this.peer.on('open', (id) => {
      console.log('[P2P] Peer connection opened with ID:', id);
      this.connectionState = 'waiting';
      this.notifyStateChange('waiting');
    });

    this.peer.on('connection', (conn) => {
      console.log('[P2P] Incoming connection from:', conn.peer);
      this.setupConnection(conn);
    });

    this.peer.on('disconnected', () => {
      console.log('[P2P] Peer disconnected from signaling server');
      this.connectionState = 'disconnected';
      this.notifyStateChange('disconnected');
      this.attemptReconnect();
    });

    this.peer.on('close', () => {
      console.log('[P2P] Peer connection closed');
      this.connectionState = 'disconnected';
      this.notifyStateChange('disconnected');
    });

    this.peer.on('error', (error) => {
      console.error('[P2P] Peer error:', error);
      this.handlePeerError(error);
    });
  }

  /**
   * Setup data connection event handlers
   * @param {Object} conn - PeerJS connection object
   */
  setupConnection(conn) {
    this.connection = conn;

    conn.on('open', () => {
      console.log('[P2P] Data channel opened');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.notifyStateChange('connected');
      this.startHeartbeat();
    });

    conn.on('data', (data) => {
      console.log('[P2P] Received data:', data.type);
      this.handleIncomingData(data);
    });

    conn.on('close', () => {
      console.log('[P2P] Data channel closed');
      this.connectionState = 'disconnected';
      this.notifyStateChange('disconnected');
      this.stopHeartbeat();
      this.attemptReconnect();
    });

    conn.on('error', (error) => {
      console.error('[P2P] Connection error:', error);
      this.connectionState = 'error';
      this.notifyStateChange('error', error.message);
    });
  }

  /**
   * Connect to a peer
   * @param {string} peerId - Target peer ID
   * @returns {Promise<void>}
   */
  async connectToPeer(peerId) {
    return new Promise((resolve, reject) => {
      try {
        console.log('[P2P] Connecting to peer:', peerId);
        this.connectionState = 'connecting';
        this.notifyStateChange('connecting');

        const conn = this.peer.connect(peerId, {
          reliable: true,
          serialization: 'json'
        });

        this.setupConnection(conn);

        // Set timeout for connection
        const timeout = setTimeout(() => {
          if (this.connectionState !== 'connected') {
            reject(new Error('Connection timeout'));
          }
        }, 30000);

        conn.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });

        conn.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send data to connected peer
   * @param {Object} data - Data to send
   * @returns {Promise<void>}
   */
  async sendData(data) {
    if (!this.connection || this.connectionState !== 'connected') {
      throw new Error('Not connected to peer');
    }

    try {
      this.connection.send(data);
      console.log('[P2P] Data sent:', data.type);
    } catch (error) {
      console.error('[P2P] Error sending data:', error);
      throw error;
    }
  }

  /**
   * Handle incoming data from peer
   * @param {Object} data - Received data
   */
  handleIncomingData(data) {
    if (!data || !data.type) {
      console.warn('[P2P] Received invalid data');
      return;
    }

    // Handle heartbeat
    if (data.type === 'heartbeat') {
      this.lastHeartbeat = Date.now();
      this.sendData({ type: 'heartbeat-ack', timestamp: Date.now() });
      return;
    }

    if (data.type === 'heartbeat-ack') {
      this.lastHeartbeat = Date.now();
      return;
    }

    // Call registered message handlers
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data);
    } else {
      console.warn('[P2P] No handler for message type:', data.type);
    }
  }

  /**
   * Register a message handler
   * @param {string} messageType - Type of message to handle
   * @param {Function} handler - Handler function
   */
  onMessage(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.lastHeartbeat = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (this.connectionState === 'connected') {
        // Check if we received a heartbeat recently
        const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
        if (timeSinceLastHeartbeat > 15000) {
          console.warn('[P2P] Heartbeat timeout, connection may be dead');
          this.disconnect();
          return;
        }

        // Send heartbeat
        this.sendData({ type: 'heartbeat', timestamp: Date.now() })
          .catch(err => console.error('[P2P] Heartbeat send error:', err));
      }
    }, 5000);
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt to reconnect to peer
   */
  async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[P2P] Max reconnect attempts reached');
      return;
    }

    if (this.isPrimary) {
      console.log('[P2P] Primary peer, waiting for secondary to reconnect');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(`[P2P] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(async () => {
      try {
        const primaryPeerId = await this.generatePeerID(this.passphrase, true);
        await this.connectToPeer(primaryPeerId);
      } catch (error) {
        console.error('[P2P] Reconnect failed:', error);
      }
    }, delay);
  }

  /**
   * Handle peer errors
   * @param {Error} error
   */
  handlePeerError(error) {
    const errorType = error.type;

    switch (errorType) {
      case 'peer-unavailable':
        console.log('[P2P] Peer not available yet, will retry...');
        this.connectionState = 'waiting';
        this.notifyStateChange('waiting');
        break;

      case 'network':
        console.error('[P2P] Network error');
        this.connectionState = 'error';
        this.notifyStateChange('error', 'Network error');
        break;

      case 'server-error':
        console.error('[P2P] Signaling server error');
        this.connectionState = 'error';
        this.notifyStateChange('error', 'Signaling server error');
        break;

      case 'unavailable-id':
        console.error('[P2P] Peer ID already taken');
        this.connectionState = 'error';
        this.notifyStateChange('error', 'Peer ID already in use');
        break;

      default:
        console.error('[P2P] Unknown error:', error);
        this.connectionState = 'error';
        this.notifyStateChange('error', error.message);
    }
  }

  /**
   * Notify state change to background script
   * @param {string} state
   * @param {string} message
   */
  notifyStateChange(state, message = '') {
    // Send message to background script or popup
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.sendMessage({
        type: 'connection-state-change',
        state: state,
        message: message,
        timestamp: Date.now()
      }).catch(err => {
        // Ignore if no listeners
      });
    }
  }

  /**
   * Wait for peer to be ready
   * @returns {Promise<void>}
   */
  waitForPeerReady() {
    return new Promise((resolve, reject) => {
      if (this.peer && this.peer.id) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Peer initialization timeout'));
      }, 10000);

      this.peer.once('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.peer.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Disconnect from peer
   */
  disconnect() {
    console.log('[P2P] Disconnecting...');

    this.stopHeartbeat();

    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }

    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    this.connectionState = 'disconnected';
    this.notifyStateChange('disconnected');
  }

  /**
   * Get connection status
   * @returns {Object}
   */
  getStatus() {
    return {
      state: this.connectionState,
      peerId: this.peerId,
      isPrimary: this.isPrimary,
      isConnected: this.connectionState === 'connected',
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Destroy manager and cleanup
   */
  destroy() {
    this.disconnect();
    this.messageHandlers.clear();
    this.passphrase = null;
    this.peerId = null;
  }
}

// Export as singleton
const p2pManager = new P2PManager();

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = p2pManager;
}

// Make available globally for browser extension
if (typeof window !== 'undefined') {
  window.P2PManager = p2pManager;
}
