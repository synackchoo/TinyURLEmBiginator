# RedirectCheck

A Chrome extension that reveals where shortened URLs really lead — without ever opening them in a tab.

Paste a `bit.ly`, `lnkd.in`, `t.co`, or any other shortened link, and RedirectCheck walks the redirect chain in the background, shows you the final destination, and (optionally) checks the destination's certificate history and domain registration so you can decide whether to trust it before clicking.

## Features

- **Resolves redirect chains in the background.** Walks each hop in the `Location` header chain and reports the final destination URL without loading the page.
- **Right-click to investigate any link.** Right-click a hyperlink on any page and choose *"Resolve with RedirectCheck"* — the popup opens with the URL pre-filled and resolved automatically.
- **Detects redirect loops** and refuses to follow them past a sane hop limit.
- **Falls back from `HEAD` to `GET`** when servers reject `HEAD` requests, with an additional `GET` follow-fallback for opaque redirects.
- **LinkedIn interstitial unwrapping.** Extracts the real destination from `lnkd.in` short links, `linkedin.com/safety/go?url=…` click-tracking wrappers, and `linkedin.com/redir/…` URLs — including chained cases where one wraps another.
- **Domain Health check.** Optional one-click lookup that summarizes the destination's certificate history (via `crt.sh`) and registration record (via `rdap.org`) into a `Low` / `Medium` / `High` risk verdict with plain-English reasoning.
- **History panel.** The last 50 resolved links are stored locally so you can revisit a previous result and its domain-health snapshot without re-fetching.
- **Light and dark themes.** A built-in theme toggle persists across sessions.
- **Flags host changes.** When the destination's domain differs from the short-link's domain, the result card surfaces a "host changed" warning.

## Install

### From the Chrome Web Store

Install RedirectCheck from its Chrome Web Store listing. Once installed, pin the extension from the toolbar puzzle-piece menu for one-click access.

### From source (developers)

1. Clone or download this repository.
2. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the cloned repository folder.

If the browser reports an error while loading, open the extension's details page and inspect the service worker (`src/background.js`) for clues.

## How to use it

There are three ways to resolve a link:

1. **Click the toolbar icon** to open the popup, paste a shortened URL, and click **Resolve**.
2. **Right-click any link** on any page and choose *"Resolve with RedirectCheck"*. The popup opens and resolves the link automatically.
3. **Reopen a past result** by clicking the **History** button in the toolbar and selecting an entry.

Once a link is resolved, click **Check Domain Health** to fetch the destination's certificate and registration data. The result is a `Low` / `Medium` / `High` verdict plus a one-line explanation; click *"Show certificate & registration details"* for the underlying numbers.

Toggle between light and dark themes with the sun/moon button in the toolbar.

## Permissions

RedirectCheck declares the minimum permissions needed to do its job:

| Permission | Why it's needed |
|---|---|
| `storage` | Persists resolved-link history, cached domain-health snapshots, and the user's theme preference in local browser storage. No data leaves the device. |
| `contextMenus` | Adds the *"Resolve with RedirectCheck"* item to the right-click menu when you right-click a link. |
| `host_permissions: <all_urls>` | Required to fetch arbitrary short-link destinations. The extension only fetches a URL when the user explicitly asks it to resolve one (or asks for a domain-health check). It never reads page content or runs scripts on visited pages. |

The extension does **not** use content scripts, does **not** read the contents of pages you visit, and does **not** track your browsing history.

## Limitations

- **HTTP redirects only.** RedirectCheck follows `3xx` responses with `Location` headers. It does not execute JavaScript, so JS-driven redirects are out of scope.
- **`<meta http-equiv="refresh">` redirects** are not yet handled.
- **Bot-protected URLs** (Cloudflare/Akamai challenge pages) appear as terminal `200` responses; the extension cannot solve a challenge.
- **The risk verdict is a heuristic**, not authoritative. It's based on registration age and certificate history — useful as a tripwire, not as a final word on safety.

## Privacy

RedirectCheck is built around the principle of *not* opening sketchy links. It does not collect personal data, has no analytics, and sends no telemetry to the developer. Resolved-link history is stored locally and never leaves your device.

When you ask the extension to resolve a link or check domain health, the necessary network requests go directly from your browser to:

- The short-link host and any other hosts in its redirect chain.
- `rdap.org` (only when you click *Check Domain Health*).
- `crt.sh` (only when you click *Check Domain Health*).

See [PRIVACY.md](./PRIVACY.md) for the full privacy policy.

## Development

This is a pure Manifest V3 extension with **no build step and no dependencies**. Source files are loaded directly by the browser:

- `src/background.js` — service worker. Owns all `fetch` calls and the context-menu handler.
- `src/resolver.js` — redirect-chain walker, including LinkedIn interstitial unwrapping.
- `src/domainHealth.js` — `crt.sh` + `rdap.org` fetchers and risk scoring.
- `src/historyStore.js` — `chrome.storage.local` history persistence.
- `src/themePreference.js` — light/dark theme persistence.
- `popup/popup.{html,css,js}` — the popup UI.

To make changes, edit the source files and reload the extension from `chrome://extensions`. Because the project uses native ES modules, all imports must include the `.js` extension and a relative path.

## License

See the LICENSE file in this repository for license terms.
