# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tiny URL EmBiginator is a Manifest V3 Chrome extension that resolves shortened URLs to their final destination by walking HTTP redirect chains in a background service worker — without ever opening the URL in a tab. It also exposes a "Domain Health" panel that queries `crt.sh` and `rdap.org` for certificate history and registration data.

## Build / test / run

There is **no build step and no bundler**. Source files are loaded directly by Chrome.

- `npm test` — defined as `node --test`, but the `tests/` directory was removed (commit `31fea8e`) and is gitignored. The script currently has nothing to execute. Do not assume tests exist; if you add behavior that needs coverage, ask the user before reintroducing a test directory.
- Load unpacked: `chrome://extensions` → Developer mode → Load unpacked → select repo root. Inspect the service worker (`src/background.js`) from the extension's details page when debugging.
- `scripts/generate_icons.py` regenerates the PNG icons under `icons/`.

Because there is no bundler, **all ES module imports must use explicit `.js` extensions and relative paths** (e.g. `import { resolveUrl } from "./resolver.js"`).

## Architecture

The extension has two execution contexts that communicate only via `chrome.runtime.sendMessage`:

1. **Background service worker** (`src/background.js`) — the only place that performs `fetch`. It listens for two message types and replies with `{ ok, result }` or `{ ok, error }`:
   - `resolve-url` → `resolver.resolveUrl(url)`
   - `check-domain-health` → `domainHealth.getDomainHealth(domain)`
2. **Popup** (`popup/popup.{html,css,js}`) — pure UI. Sends messages to the background, renders results, and persists history via `chrome.storage.local`. Never calls `fetch` directly.

When adding a new network capability, add a new message type in `background.js` and a corresponding module in `src/`; do not introduce `fetch` calls in the popup.

### Redirect resolution (`src/resolver.js`)

`resolveUrl` walks redirects manually rather than letting the browser follow them, so each hop is observable:

- Issues `HEAD` with `redirect: "manual"`. Falls back to `GET` (with `Range: bytes=0-0`) when the server returns 405/501, and falls back again to `redirect: "follow"` when the response is an opaque redirect with no `Location`.
- Treats only `301/302/303/307/308` as redirects. Any other status terminates the chain.
- Tracks visited URLs in a `Set` to detect loops; enforces `DEFAULT_MAX_HOPS = 10` and `DEFAULT_TIMEOUT_MS = 8000` (overridable via `options`).
- **LinkedIn special case:** when the chain ends on a `lnkd.in` / `linkedin.com` host, `maybeExtractLinkedInInterstitialTarget` re-fetches the page with `GET` and scans the HTML for the first external `https?://` link that isn't a LinkedIn host. This handles the JS-less interstitial warning page.
- Returns `{ inputUrl, finalUrl, inputHost, finalHost, hostChanged, hops, chain }`. Tests for `hostChanged` should compare the normalized `inputHost` from `normalizeInputUrl`, not the user's raw input.

`options.fetchImpl` exists specifically so `resolveUrl` can be exercised against a fake fetch — preserve this seam when refactoring.

### Domain health (`src/domainHealth.js`)

`getDomainHealth(domain)` is the only export. It aggregates a `crt.sh` certificate-history summary and an `rdap.org` registration summary, then derives a `{ level: "Low" | "Medium" | "High" | "Unknown", score, reasons }` risk object from registration age and certificate volume. The `reasons` array contains plain-English sentences ready to display in the UI — prefer `risk.reasons[0]` over re-deriving a summary. Each upstream is wrapped so a single failure populates an `error` field rather than rejecting the whole call.

### History (`src/historyStore.js`)

Persists up to 50 resolved URLs under `chrome.storage.local["resolvedUrlHistory"]`. All public functions (`loadHistoryEntries`, `saveHistoryEntries`, `prependResolvedEntry`, `updateHistoryEntryDomainHealth`) run input through an internal `sanitizeHistoryEntries` that deep-clones entries and discards anything that doesn't match the expected shape — treat sanitized output as the canonical form and never write raw entries to storage. `prependResolvedEntry` dedupes by `id` so re-resolving a URL moves it to the top instead of duplicating.

### Theme (`src/themePreference.js`, popup wiring)

A small Light/Dark toggle whose preference is persisted in `chrome.storage.local`. The popup applies the class on load before first paint to avoid a flash.

## Manifest notes

- `manifest.json` declares `permissions: ["storage"]` and `host_permissions: ["http://*/*", "https://*/*"]` — the broad host permission is what allows the background worker to fetch arbitrary short-link domains. Narrowing it would break resolution.
- Background worker is declared as `"type": "module"`, which is why `src/*.js` use ES module syntax.
