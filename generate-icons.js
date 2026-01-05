/**
 * SynchroPeer - Icon Generator
 * Generates extension icons in multiple sizes using Canvas API
 * Run with: node generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon
const createSVGIcon = (size) => {
  const strokeWidth = Math.max(2, Math.floor(size / 32));
  const circleRadius = Math.floor(size * 0.15);
  const leftX = Math.floor(size * 0.25);
  const rightX = Math.floor(size * 0.75);
  const centerY = size / 2;
  const lineLength = Math.floor(size * 0.15);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background gradient -->
  <defs>
    <linearGradient id="grad${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="url(#grad${size})"/>

  <!-- Left peer node -->
  <circle cx="${leftX}" cy="${centerY}" r="${circleRadius}" stroke="white" stroke-width="${strokeWidth}" fill="none"/>

  <!-- Right peer node -->
  <circle cx="${rightX}" cy="${centerY}" r="${circleRadius}" stroke="white" stroke-width="${strokeWidth}" fill="none"/>

  <!-- Connection line -->
  <line x1="${leftX + circleRadius}" y1="${centerY}" x2="${rightX - circleRadius}" y2="${centerY}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>

  <!-- Connection arrows -->
  <path d="M ${leftX + circleRadius + lineLength} ${centerY - lineLength} L ${leftX + circleRadius} ${centerY}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <path d="M ${rightX - circleRadius - lineLength} ${centerY + lineLength} L ${rightX - circleRadius} ${centerY}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>

  <!-- Sync arrows around nodes -->
  <path d="M ${leftX - circleRadius * 0.7} ${centerY - circleRadius * 1.3} L ${leftX - circleRadius * 1.3} ${centerY - circleRadius * 0.7}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <path d="M ${leftX - circleRadius * 0.7} ${centerY + circleRadius * 1.3} L ${leftX - circleRadius * 1.3} ${centerY + circleRadius * 0.7}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>

  <path d="M ${rightX + circleRadius * 0.7} ${centerY - circleRadius * 1.3} L ${rightX + circleRadius * 1.3} ${centerY - circleRadius * 0.7}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
  <path d="M ${rightX + circleRadius * 0.7} ${centerY + circleRadius * 1.3} L ${rightX + circleRadius * 1.3} ${centerY + circleRadius * 0.7}" stroke="white" stroke-width="${strokeWidth}" stroke-linecap="round"/>
</svg>`;
};

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons in different sizes
const sizes = [16, 32, 48, 128];

console.log('🎨 Generating SynchroPeer icons...\n');

sizes.forEach(size => {
  const svg = createSVGIcon(size);
  const filename = `icon${size}.svg`;
  const filepath = path.join(iconsDir, filename);

  fs.writeFileSync(filepath, svg);
  console.log(`✅ Generated ${filename} (${size}x${size})`);
});

// Also create PNG placeholders instruction
const readmePath = path.join(iconsDir, 'README.txt');
const readmeContent = `SynchroPeer Icons
================

SVG icons have been generated. For production use, convert these to PNG format:

Option 1 - Using ImageMagick:
  convert icon16.svg icon16.png
  convert icon32.svg icon32.png
  convert icon48.svg icon48.png
  convert icon128.svg icon128.png

Option 2 - Using Inkscape:
  inkscape icon16.svg --export-filename=icon16.png
  inkscape icon32.svg --export-filename=icon32.png
  inkscape icon48.svg --export-filename=icon48.png
  inkscape icon128.svg --export-filename=icon128.png

Option 3 - Online converter:
  Visit https://cloudconvert.com/svg-to-png
  Upload each SVG and download as PNG

Option 4 - Use SVG directly (Chrome supports it):
  Rename icon*.svg to icon*.png in manifest.json

Note: Firefox requires PNG format for icons.
`;

fs.writeFileSync(readmePath, readmeContent);
console.log(`\n📝 Created ${path.basename(readmePath)}`);

// Create a simple PNG fallback script
const pngFallbackScript = `#!/bin/bash
# Simple PNG conversion script using ImageMagick
# Install ImageMagick first: brew install imagemagick (Mac) or apt-get install imagemagick (Linux)

cd "$(dirname "$0")"

if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it first."
    exit 1
fi

echo "Converting SVG to PNG..."
convert icon16.svg icon16.png
convert icon32.svg icon32.png
convert icon48.svg icon48.png
convert icon128.svg icon128.png
echo "✅ PNG icons generated!"
`;

fs.writeFileSync(path.join(iconsDir, 'convert-to-png.sh'), pngFallbackScript);
fs.chmodSync(path.join(iconsDir, 'convert-to-png.sh'), '755');

console.log(`✅ Created convert-to-png.sh script\n`);
console.log('🎉 Icon generation complete!');
console.log('\nNext steps:');
console.log('  1. Convert SVG icons to PNG using one of the methods in icons/README.txt');
console.log('  2. Or run: cd icons && ./convert-to-png.sh');
console.log('  3. Build the extension: npm run build\n');
