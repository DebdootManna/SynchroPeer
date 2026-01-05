const fs = require('fs-extra');
const path = require('path');

const browsers = process.argv[2] ? [process.argv[2]] : ['chrome', 'firefox'];

async function build() {
  console.log('🚀 Building SynchroPeer...\n');

  for (const browser of browsers) {
    console.log(`📦 Building for ${browser}...`);

    const distDir = path.join(__dirname, 'dist', browser);

    // Clean and create dist directory
    await fs.remove(distDir);
    await fs.ensureDir(distDir);

    // Copy manifest
    const manifestSource = browser === 'chrome'
      ? 'manifest.chrome.json'
      : 'manifest.firefox.json';
    await fs.copy(
      path.join(__dirname, manifestSource),
      path.join(distDir, 'manifest.json')
    );

    // Copy source files
    const srcDir = path.join(__dirname, 'src');

    // Copy background scripts
    if (await fs.pathExists(path.join(srcDir, 'background'))) {
      const bgFiles = await fs.readdir(path.join(srcDir, 'background'));
      for (const file of bgFiles) {
        await fs.copy(
          path.join(srcDir, 'background', file),
          path.join(distDir, file)
        );
      }
    }

    // Copy utils
    if (await fs.pathExists(path.join(srcDir, 'utils'))) {
      await fs.copy(
        path.join(srcDir, 'utils'),
        path.join(distDir, 'utils')
      );
    }

    // Copy popup
    if (await fs.pathExists(path.join(srcDir, 'popup'))) {
      const popupFiles = await fs.readdir(path.join(srcDir, 'popup'));
      for (const file of popupFiles) {
        await fs.copy(
          path.join(srcDir, 'popup', file),
          path.join(distDir, file)
        );
      }
    }

    // Copy icons
    if (await fs.pathExists(path.join(__dirname, 'icons'))) {
      await fs.copy(
        path.join(__dirname, 'icons'),
        path.join(distDir, 'icons')
      );
    }

    // Copy lib directory (PeerJS and polyfill)
    await fs.ensureDir(path.join(distDir, 'lib'));

    // Copy webextension-polyfill for Firefox
    if (browser === 'firefox') {
      const polyfillSource = path.join(__dirname, 'node_modules', 'webextension-polyfill', 'dist', 'browser-polyfill.min.js');
      if (await fs.pathExists(polyfillSource)) {
        await fs.copy(
          polyfillSource,
          path.join(distDir, 'lib', 'browser-polyfill.min.js')
        );
      }
    }

    // Copy PeerJS
    const peerjsSource = path.join(__dirname, 'node_modules', 'peerjs', 'dist', 'peerjs.min.js');
    if (await fs.pathExists(peerjsSource)) {
      await fs.copy(
        peerjsSource,
        path.join(distDir, 'lib', 'peerjs.min.js')
      );
    }

    console.log(`✅ ${browser} build complete at dist/${browser}\n`);
  }

  console.log('🎉 Build completed successfully!');
  console.log('\nNext steps:');
  console.log('  Chrome: Load unpacked extension from dist/chrome');
  console.log('  Firefox: Load temporary add-on from dist/firefox');
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
