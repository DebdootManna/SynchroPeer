/**
 * SynchroPeer - Crypto Utility
 * AES-256-GCM encryption/decryption using Web Crypto API
 */

class CryptoManager {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12; // 96 bits for GCM
    this.saltLength = 16;
    this.iterations = 100000;
  }

  /**
   * Derive encryption key from passphrase using PBKDF2
   * @param {string} passphrase - User's secret passphrase
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>}
   */
  async deriveKey(passphrase, salt) {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      passphraseKey,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate a deterministic peer ID from passphrase
   * @param {string} passphrase - User's secret passphrase
   * @returns {Promise<string>} - Hex string of hash (used as PeerID)
   */
  async generatePeerID(passphrase) {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // Return first 32 characters for a cleaner peer ID
    return 'sp-' + hashHex.substring(0, 32);
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {object} data - Data to encrypt
   * @param {string} passphrase - User's secret passphrase
   * @returns {Promise<string>} - Base64 encoded encrypted data with salt and IV
   */
  async encrypt(data, passphrase) {
    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

      // Derive key from passphrase
      const key = await this.deriveKey(passphrase, salt);

      // Convert data to JSON string then to ArrayBuffer
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      const dataBuffer = encoder.encode(dataString);

      // Encrypt
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        dataBuffer
      );

      // Combine salt + iv + encrypted data
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(encryptedArray, salt.length + iv.length);

      // Convert to base64
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @param {string} passphrase - User's secret passphrase
   * @returns {Promise<object>} - Decrypted data object
   */
  async decrypt(encryptedData, passphrase) {
    try {
      // Convert from base64
      const combined = this.base64ToArrayBuffer(encryptedData);

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const encrypted = combined.slice(this.saltLength + this.ivLength);

      // Derive key from passphrase
      const key = await this.deriveKey(passphrase, salt);

      // Decrypt
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encrypted
      );

      // Convert ArrayBuffer to string and parse JSON
      const decoder = new TextDecoder();
      const decryptedString = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - wrong passphrase or corrupted data');
    }
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * @param {Uint8Array} buffer
   * @returns {string}
   */
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string to Uint8Array
   * @param {string} base64
   * @returns {Uint8Array}
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Hash data using SHA-256
   * @param {string} data - Data to hash
   * @returns {Promise<string>} - Hex string of hash
   */
  async hash(data) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Export as singleton
const cryptoManager = new CryptoManager();

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cryptoManager;
}

// Make available globally for browser extension
if (typeof window !== 'undefined') {
  window.CryptoManager = cryptoManager;
}
