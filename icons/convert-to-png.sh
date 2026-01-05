#!/bin/bash
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
