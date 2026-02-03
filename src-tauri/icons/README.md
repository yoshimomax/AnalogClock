# App Icons

This directory should contain the following icon files for the app:

- `icon.ico` - Windows icon (256x256)
- `icon.icns` - macOS icon
- `32x32.png` - 32x32 PNG
- `128x128.png` - 128x128 PNG
- `128x128@2x.png` - 256x256 PNG (for Retina displays)

## Generating Icons

You can use the Tauri CLI to generate icons from a single PNG:

```bash
npm run tauri icon path/to/source-icon.png
```

Or use online tools like:
- https://www.icoconverter.com/
- https://cloudconvert.com/png-to-ico

For now, you can download a clock icon from:
- https://www.flaticon.com/
- https://icons8.com/
