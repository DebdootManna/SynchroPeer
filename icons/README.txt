SynchroPeer Icons
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
