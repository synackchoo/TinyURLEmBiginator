# Tiny URL EmBiginator

Chrome extension MVP that resolves shortened URLs to their final destination without opening the URL in a tab.

## Features

- Resolves redirect chains via background requests.
- Shows each redirect hop and the final URL.
- Detects redirect loops.
- Falls back from `HEAD` to `GET` when servers reject `HEAD`.
- Flags when destination domain differs from the short-link domain.
- Extracts external destination URLs from LinkedIn `lnkd.in` interstitial warning pages.
- Adds a collapsible `Check Domain Health` panel with `crt.sh` certificate history and `rdap.org` registration data.
- Stores resolved URLs in a history panel so past entries can be reloaded and their domain-health snapshots revisited.

## Limitations

- Detects HTTP redirect chains only (`3xx` + `Location`).
- Does not execute page JavaScript, so JS-based redirects are out of scope.
- Does not evaluate landing-page safety/reputation, only the destination URL chain.

## Local test

```bash
npm test
```

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder.
