/**
 * SynchroPeer - Sync Logic
 * Handles bookmark and history extraction, diffing, and conflict resolution
 */

class SyncLogic {
  constructor() {
    this.lastSyncTime = 0;
    this.syncedItemsCache = new Map();
  }

  /**
   * Extract all bookmarks as a flat tree structure
   * @returns {Promise<Array>} - Array of bookmark objects
   */
  async extractBookmarks() {
    try {
      const bookmarkTree = await browser.bookmarks.getTree();
      const flatBookmarks = [];

      const traverse = (nodes, path = []) => {
        for (const node of nodes) {
          const bookmark = {
            id: node.id,
            parentId: node.parentId,
            index: node.index,
            title: node.title || '',
            url: node.url || null,
            dateAdded: node.dateAdded || Date.now(),
            dateGroupModified: node.dateGroupModified || null,
            type: node.url ? 'bookmark' : 'folder',
            path: [...path, node.title || 'root']
          };

          flatBookmarks.push(bookmark);

          if (node.children) {
            traverse(node.children, bookmark.path);
          }
        }
      };

      traverse(bookmarkTree);
      return flatBookmarks;
    } catch (error) {
      console.error('Error extracting bookmarks:', error);
      return [];
    }
  }

  /**
   * Extract browsing history
   * @param {number} maxItems - Maximum number of history items to extract
   * @returns {Promise<Array>} - Array of history objects
   */
  async extractHistory(maxItems = 10000) {
    try {
      const historyItems = await browser.history.search({
        text: '',
        maxResults: maxItems,
        startTime: 0
      });

      return historyItems.map(item => ({
        id: item.id,
        url: item.url,
        title: item.title || '',
        visitCount: item.visitCount || 0,
        lastVisitTime: item.lastVisitTime || Date.now(),
        typedCount: item.typedCount || 0
      }));
    } catch (error) {
      console.error('Error extracting history:', error);
      return [];
    }
  }

  /**
   * Create a snapshot of current browser data
   * @returns {Promise<Object>} - Complete snapshot
   */
  async createSnapshot() {
    const [bookmarks, history] = await Promise.all([
      this.extractBookmarks(),
      this.extractHistory()
    ]);

    return {
      timestamp: Date.now(),
      bookmarks: bookmarks,
      history: history,
      bookmarkCount: bookmarks.length,
      historyCount: history.length
    };
  }

  /**
   * Calculate delta between two snapshots
   * @param {Object} localSnapshot - Local browser data
   * @param {Object} remoteSnapshot - Remote peer data
   * @returns {Object} - Delta with items to add/update/remove
   */
  calculateDelta(localSnapshot, remoteSnapshot) {
    const delta = {
      bookmarksToAdd: [],
      bookmarksToUpdate: [],
      historyToAdd: [],
      timestamp: Date.now()
    };

    // Create lookup maps for local data
    const localBookmarkMap = new Map(
      localSnapshot.bookmarks.map(b => [this.getBookmarkKey(b), b])
    );
    const localHistoryMap = new Map(
      localSnapshot.history.map(h => [h.url, h])
    );

    // Find bookmarks to add or update
    for (const remoteBookmark of remoteSnapshot.bookmarks) {
      const key = this.getBookmarkKey(remoteBookmark);
      const localBookmark = localBookmarkMap.get(key);

      if (!localBookmark) {
        delta.bookmarksToAdd.push(remoteBookmark);
      } else {
        // Check if remote is newer (last-modified-wins)
        const remoteTime = remoteBookmark.dateGroupModified || remoteBookmark.dateAdded;
        const localTime = localBookmark.dateGroupModified || localBookmark.dateAdded;

        if (remoteTime > localTime) {
          delta.bookmarksToUpdate.push(remoteBookmark);
        }
      }
    }

    // Find history items to add
    for (const remoteHistory of remoteSnapshot.history) {
      const localHistory = localHistoryMap.get(remoteHistory.url);

      if (!localHistory) {
        delta.historyToAdd.push(remoteHistory);
      } else {
        // Merge visit counts and use the latest visit time
        if (remoteHistory.lastVisitTime > localHistory.lastVisitTime) {
          delta.historyToAdd.push({
            ...remoteHistory,
            visitCount: Math.max(remoteHistory.visitCount, localHistory.visitCount)
          });
        }
      }
    }

    return delta;
  }

  /**
   * Generate a unique key for a bookmark (for deduplication)
   * @param {Object} bookmark
   * @returns {string}
   */
  getBookmarkKey(bookmark) {
    if (bookmark.url) {
      return `url:${bookmark.url}`;
    } else {
      return `folder:${bookmark.path.join('/')}`;
    }
  }

  /**
   * Apply delta to local browser
   * @param {Object} delta - Delta to apply
   * @returns {Promise<Object>} - Result summary
   */
  async applyDelta(delta) {
    const results = {
      bookmarksAdded: 0,
      bookmarksUpdated: 0,
      historyAdded: 0,
      errors: []
    };

    // Apply bookmark additions
    for (const bookmark of delta.bookmarksToAdd) {
      try {
        await this.addBookmark(bookmark);
        results.bookmarksAdded++;
      } catch (error) {
        console.error('Error adding bookmark:', error);
        results.errors.push({ type: 'bookmark_add', error: error.message });
      }
    }

    // Apply bookmark updates
    for (const bookmark of delta.bookmarksToUpdate) {
      try {
        await this.updateBookmark(bookmark);
        results.bookmarksUpdated++;
      } catch (error) {
        console.error('Error updating bookmark:', error);
        results.errors.push({ type: 'bookmark_update', error: error.message });
      }
    }

    // Apply history additions
    for (const historyItem of delta.historyToAdd) {
      try {
        await this.addHistoryItem(historyItem);
        results.historyAdded++;
      } catch (error) {
        console.error('Error adding history:', error);
        results.errors.push({ type: 'history_add', error: error.message });
      }
    }

    return results;
  }

  /**
   * Add a bookmark to the local browser
   * @param {Object} bookmark
   * @returns {Promise<void>}
   */
  async addBookmark(bookmark) {
    try {
      // Find or create parent folder
      const parentId = await this.findOrCreateParentFolder(bookmark.path.slice(0, -1));

      if (bookmark.type === 'folder') {
        await browser.bookmarks.create({
          parentId: parentId,
          title: bookmark.title,
          index: bookmark.index
        });
      } else {
        // Check if bookmark already exists
        const existing = await browser.bookmarks.search({ url: bookmark.url });
        if (existing.length === 0) {
          await browser.bookmarks.create({
            parentId: parentId,
            title: bookmark.title,
            url: bookmark.url,
            index: bookmark.index
          });
        }
      }
    } catch (error) {
      console.error('Error in addBookmark:', error);
      throw error;
    }
  }

  /**
   * Update an existing bookmark
   * @param {Object} bookmark
   * @returns {Promise<void>}
   */
  async updateBookmark(bookmark) {
    try {
      const existing = await browser.bookmarks.search({ url: bookmark.url });
      if (existing.length > 0) {
        await browser.bookmarks.update(existing[0].id, {
          title: bookmark.title,
          url: bookmark.url
        });
      } else {
        await this.addBookmark(bookmark);
      }
    } catch (error) {
      console.error('Error in updateBookmark:', error);
      throw error;
    }
  }

  /**
   * Find or create a parent folder based on path
   * @param {Array<string>} path - Folder path
   * @returns {Promise<string>} - Parent folder ID
   */
  async findOrCreateParentFolder(path) {
    try {
      // Start from bookmarks toolbar or menu
      let currentParentId = '1'; // Default bookmarks folder

      for (let i = 1; i < path.length; i++) {
        const folderName = path[i];
        const children = await browser.bookmarks.getChildren(currentParentId);

        let found = children.find(child => !child.url && child.title === folderName);

        if (!found) {
          // Create the folder
          found = await browser.bookmarks.create({
            parentId: currentParentId,
            title: folderName
          });
        }

        currentParentId = found.id;
      }

      return currentParentId;
    } catch (error) {
      console.error('Error in findOrCreateParentFolder:', error);
      return '1'; // Fallback to default bookmarks folder
    }
  }

  /**
   * Add a history item to the local browser
   * @param {Object} historyItem
   * @returns {Promise<void>}
   */
  async addHistoryItem(historyItem) {
    try {
      // Check if URL is valid
      if (!historyItem.url || !historyItem.url.startsWith('http')) {
        return;
      }

      // Add to history
      await browser.history.addUrl({
        url: historyItem.url,
        title: historyItem.title,
        visitTime: historyItem.lastVisitTime
      });
    } catch (error) {
      console.error('Error in addHistoryItem:', error);
      throw error;
    }
  }

  /**
   * Merge two snapshots using last-modified-wins strategy
   * @param {Object} snapshot1
   * @param {Object} snapshot2
   * @returns {Object} - Merged snapshot
   */
  mergeSnapshots(snapshot1, snapshot2) {
    const bookmarkMap = new Map();
    const historyMap = new Map();

    // Process first snapshot
    for (const bookmark of snapshot1.bookmarks) {
      const key = this.getBookmarkKey(bookmark);
      bookmarkMap.set(key, bookmark);
    }

    for (const history of snapshot1.history) {
      historyMap.set(history.url, history);
    }

    // Process second snapshot (newer wins)
    for (const bookmark of snapshot2.bookmarks) {
      const key = this.getBookmarkKey(bookmark);
      const existing = bookmarkMap.get(key);

      if (!existing) {
        bookmarkMap.set(key, bookmark);
      } else {
        const existingTime = existing.dateGroupModified || existing.dateAdded;
        const newTime = bookmark.dateGroupModified || bookmark.dateAdded;

        if (newTime > existingTime) {
          bookmarkMap.set(key, bookmark);
        }
      }
    }

    for (const history of snapshot2.history) {
      const existing = historyMap.get(history.url);

      if (!existing) {
        historyMap.set(history.url, history);
      } else {
        // Keep the one with the latest visit time and highest visit count
        if (history.lastVisitTime > existing.lastVisitTime) {
          historyMap.set(history.url, {
            ...history,
            visitCount: Math.max(history.visitCount, existing.visitCount)
          });
        }
      }
    }

    return {
      timestamp: Math.max(snapshot1.timestamp, snapshot2.timestamp),
      bookmarks: Array.from(bookmarkMap.values()),
      history: Array.from(historyMap.values()),
      bookmarkCount: bookmarkMap.size,
      historyCount: historyMap.size
    };
  }

  /**
   * Get sync statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const [bookmarks, history] = await Promise.all([
      this.extractBookmarks(),
      this.extractHistory()
    ]);

    return {
      totalBookmarks: bookmarks.length,
      totalHistory: history.length,
      lastSyncTime: this.lastSyncTime,
      cacheSize: this.syncedItemsCache.size
    };
  }

  /**
   * Clear sync cache
   */
  clearCache() {
    this.syncedItemsCache.clear();
    this.lastSyncTime = 0;
  }
}

// Export as singleton
const syncLogic = new SyncLogic();

// For ES6 modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = syncLogic;
}

// Make available globally for browser extension
if (typeof window !== 'undefined') {
  window.SyncLogic = syncLogic;
}
