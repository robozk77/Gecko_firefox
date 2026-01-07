# Gecko CSPT Detector - Firefox Edition

**Official Firefox port of vitorfhc/gecko Chrome extension**

Automated Client-Side Path Traversal (CSPT) discovery tool for Firefox.

## What is CSPT?

Client-Side Path Traversal occurs when web applications use URL parameters (query strings, path segments) to dynamically construct API request paths on the client side. This can lead to path traversal vulnerabilities.

### Example

1. You visit: `https://example.com/user?id=123`
2. The app makes a request to: `/api/users/123`
3. You change to: `https://example.com/user?id=../../admin`
4. The app requests: `/api/users/../../admin` → `/api/admin` 🚨

Gecko automatically detects these patterns in real-time!

## Installation

### Temporary Installation
1. Extract this ZIP file
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from the extracted folder

### Permanent Installation
1. Download **Firefox Developer Edition** or **Firefox ESR**
2. Open `about:config` and set `xpinstall.signatures.required` to `false`
3. Go to `about:addons`
4. Click the gear icon → "Install Add-on From File"
5. Select `manifest.json`

## How It Works

1. **Extracts Sources**: When you navigate to a page, Gecko extracts all URL components:
   - Query parameter values
   - Path segments
   - URL-encoded and decoded variants
   - `null` and `undefined` values

2. **Monitors Requests**: Watches all HTTP requests made by the current tab

3. **Detects CSPT**: If extracted sources appear in request URL paths, it flags as potential CSPT

4. **Real-time Alerts**: Findings appear instantly in the DevTools panel with a badge counter

## Usage

1. Click the Gecko icon (🦎) to configure settings
2. Open DevTools (F12) → Navigate to "Gecko" panel
3. Browse target web applications normally
4. Review findings that appear automatically
5. Click findings to expand details and exploitation tips

## Configuration

### Scanners
- **Search Query Values**: Extract values from URL query parameters
- **Search Path**: Extract segments from URL path
- **Search Null/Undefined**: Look for null/undefined in requests

### Matching
- **Partial Match**: Match substrings (not just exact matches)
- **Case Insensitive**: Ignore case when matching
- **Partial Min Length**: Minimum length for partial matches (default: 3)

### Display
- **Clear on Refresh**: Auto-clear findings when page refreshes

## Bug Bounty Tips

🎯 **Best Targets:**
- Single Page Applications (SPAs)
- React, Vue, Angular apps
- REST APIs with dynamic routing
- Applications with client-side navigation

🔍 **What to Look For:**
- URL parameters that control content loading
- Dynamic API endpoints that mirror URL structure
- Client-side routing with parameter interpolation

🚀 **Testing Payloads:**
- `../` - Basic traversal
- `../../` - Multi-level traversal
- `%2e%2e%2f` - URL-encoded
- `%252e%252e%252f` - Double-encoded
- `..\` - Windows-style (if applicable)

## Features

✅ Real-time CSPT detection  
✅ Automatic source extraction  
✅ Multiple source types (query params, paths, encoded variants)  
✅ Configurable matching (exact, partial, case-insensitive)  
✅ Badge counter for findings  
✅ Beautiful DevTools UI  
✅ Search and filter findings  
✅ Deduplication to avoid noise  
✅ Ad network filtering  

## Credits

- **Original Extension**: Vitor Falcao ([@vitorfhc](https://github.com/vitorfhc))
- **Original Repo**: https://github.com/vitorfhc/gecko
- **Blog Post**: https://vitorfalcao.com/posts/automating-cspt-discovery/
- **Firefox Port**: Direct conversion from official TypeScript source

## License

For security research and bug bounty purposes.

## Support

For issues with the original extension logic, see: https://github.com/vitorfhc/gecko/issues  
For Firefox-specific issues, check your browser console for errors.

---

Happy hunting! 🦎🔍
