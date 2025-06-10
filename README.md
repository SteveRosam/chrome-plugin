# Chrome Extension Starter

A well-structured Chrome extension template with modern JavaScript and clean organization.

## Project Structure
```
chrome-extension/
├── src/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── scripts/
│   │   └── popup.js
│   ├── styles/
│   │   └── popup.css
│   └── popup.html
├── manifest.json
└── README.md
```

## Features
- Manifest V3 compliant
- Organized file structure
- Basic popup UI with styling
- Example button with click handler
- Ready for content scripts and background scripts

## Setup Instructions

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `chrome-extension` directory
4. The extension should now be loaded in Chrome

## Development

- `manifest.json` - Extension configuration
- `src/popup.html` - Popup UI
- `src/scripts/popup.js` - Popup JavaScript
- `src/styles/popup.css` - Popup styling
- `src/icons/` - Extension icons in multiple sizes

## Next Steps

1. Add your extension's functionality to `src/scripts/popup.js`
2. Create content scripts in `src/scripts/` if needed
3. Add background scripts for persistent tasks
4. Update the manifest with additional permissions as needed
