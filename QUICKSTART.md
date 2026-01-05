# SynchroPeer - Quick Start Guide

Get up and running in 5 minutes! 🚀

---

## ⚡ Quick Setup

### 1. Build the Extension (1 minute)

```bash
cd SynchroPeer
npm install
npm run build
```

### 2. Load in Chrome (30 seconds)

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select `SynchroPeer/dist/chrome` folder
5. Pin extension to toolbar

### 3. Load in Firefox (30 seconds)

1. Open Firefox → `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Navigate to `SynchroPeer/dist/firefox` and select `manifest.json`

---

## 🔗 Connect & Sync (2 minutes)

### On Chrome (Primary Device):

1. Click SynchroPeer icon
2. Enter passphrase: `my-secret-sync-key-2024`
3. Select: ⚪ **Primary**
4. Click **Start Connection**
5. Wait for "Waiting for peer..." status

### On Firefox (Secondary Device):

1. Click SynchroPeer icon
2. Enter **same** passphrase: `my-secret-sync-key-2024`
3. Select: ⚪ **Secondary**
4. Click **Start Connection**
5. Should connect within 5-10 seconds

### Sync Your Data:

1. Once connected (green ✓), click **Sync Now**
2. Wait 2-5 seconds for completion
3. Check your bookmarks and history on both browsers!

---

## 🧪 Quick Test

**Add a bookmark in Chrome:**
```
https://github.com - GitHub
```

**Sync from Chrome** → Click "Sync Now"

**Check Firefox bookmarks** → Should see GitHub bookmark!

**Success!** 🎉

---

## 🐛 Troubleshooting

**Not connecting?**
- ✅ Same passphrase on both?
- ✅ Different roles (Primary/Secondary)?
- ✅ Primary device started first?

**Not syncing?**
- ✅ Green status indicator?
- ✅ Clicked "Sync Now"?
- ✅ Permissions granted?

**Still stuck?**
- Check console: Right-click extension → Inspect
- Read TESTING_GUIDE.md for detailed help
- Check README.md for architecture info

---

## 📚 What's Next?

- Read **TESTING_GUIDE.md** for comprehensive testing
- Read **README.md** for architecture details
- Experiment with different sync scenarios
- Test with your actual bookmarks/history
- Try disconnecting and reconnecting
- Test on different networks

---

## ⚠️ Important Notes

1. **Both browsers must be open** for sync to work (it's real-time P2P)
2. **Firefox extension is temporary** - reload after restart
3. **Use strong passphrase** for production use (min 12 chars)
4. **Data is encrypted** - even you can't read it without the passphrase
5. **No cloud storage** - data goes directly device-to-device

---

## 🎯 Key Features You Get

✅ **Bookmark Sync** - All your bookmarks, including folders  
✅ **History Sync** - Up to 5000 history items  
✅ **End-to-End Encryption** - AES-256-GCM  
✅ **No Cloud** - Direct P2P connection  
✅ **Cross-Browser** - Chrome ↔ Firefox ↔ Edge ↔ Brave  
✅ **Privacy First** - No tracking, no telemetry  

---

## 🔐 Security

- **Passphrase never leaves your device**
- **All data encrypted before transmission**
- **Peer IDs derived from passphrase hash**
- **No data stored on intermediary servers**

---

## 🎓 How It Works (Simple Version)

```
Your Passphrase
      ↓
Generate Peer ID (unique hash)
      ↓
Connect via WebRTC (P2P)
      ↓
Encrypt data (AES-256)
      ↓
Send directly to peer
      ↓
Decrypt on other device
      ↓
Merge bookmarks/history
```

---

## 📦 What Gets Synced?

**Bookmarks:**
- URL, Title, Folder structure
- Creation date
- All folders and subfolders

**History:**
- URL, Title
- Last visit time
- Visit count
- Last 5000 items (configurable)

---

## 🚀 Pro Tips

1. **Use strong passphrase** - Treat it like a password
2. **Start Primary first** - Wait for "Waiting for peer"
3. **Be patient** - First sync may take 10-30s for large datasets
4. **Check console** - F12 → Console for detailed logs
5. **Test small first** - Try with few bookmarks initially

---

## 📱 Supported Browsers

| Browser | Platform | Status |
|---------|----------|--------|
| Chrome | Desktop | ✅ Fully Supported |
| Firefox | Desktop | ✅ Fully Supported |
| Edge | Desktop | ✅ Fully Supported |
| Brave | Desktop | ✅ Fully Supported |
| Arc | Desktop | ✅ Fully Supported |
| Opera | Desktop | ⚠️ Untested |
| Safari | Desktop | ❌ Not Yet |

---

## 🎉 You're Ready!

That's it! You now have a working P2P sync system between browsers.

**Your data stays yours. No cloud. No tracking. Pure P2P.**

---

## 📞 Need Help?

- **Detailed testing**: See `TESTING_GUIDE.md`
- **Architecture**: See `README.md`
- **Issues**: Check browser console logs
- **Bugs**: Open GitHub issue

---

**Happy Syncing!** 🎊

*Made with ❤️ for privacy-conscious users*