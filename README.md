# Tiny URL EmBiginator

Chrome extension tool that resolves shortened URLs to their final destination without opening the URL in a tab.

## Features

- Resolves redirect chains via background requests.
- Shows each redirect hop and the final URL.
- Detects redirect loops.
- Falls back from `HEAD` to `GET` when servers reject `HEAD`.
- Flags when destination domain differs from the short-link domain.
- Extracts external destination URLs from LinkedIn `lnkd.in` interstitial warning pages.
- Adds a collapsible `Check Domain Health` panel with `crt.sh` certificate history and `rdap.org` registration data.
- Summarizes domain health as `Low`, `Medium`, or `High` risk based on registration age and certificate history.
- Stores resolved URLs in a history panel so past entries can be reloaded and their domain-health snapshots revisited.
- Includes a popup theme toggle button that switches between `Light` and `Dark` modes.

## Limitations

- Detects HTTP redirect chains only (`3xx` + `Location`).
- Does not execute page JavaScript, so JS-based redirects are out of scope.
- Does not evaluate landing-page safety/reputation, only the destination URL chain.

## Local test

```bash
npm test
```

## Load unpacked in a browser

Use a Chromium-based browser for testing this extension unpacked, such as Chrome, Edge, or Brave.

1. Open your browser's extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `/home/bryce/projects/TinyURLEmBiginator`

If the browser reports an error while loading, open the extension details page and inspect the service worker for `src/background.js`.
