# Privacy Policy for RedirectCheck

Effective date: April 15, 2026

RedirectCheck is a Chrome extension that reveals where shortened URLs lead without opening them in a new tab.

## Single Purpose

RedirectCheck has a single purpose: to resolve shortened or redirecting URLs to their final destination, and to optionally provide certificate-history and domain-registration context for that destination, so users can decide whether a link is safe to visit.

## Scope

For Chrome Web Store disclosure purposes, the only category of user data this extension processes is **Website Content**. In this extension, "Website Content" means the URL or link content a user submits for analysis, along with the redirect-chain and destination information needed to show where that link leads.

## Information the Extension Processes

The extension processes the following Website Content only when the user explicitly asks it to resolve a link or check a domain:

- The URL or link content the user submits — either by typing/pasting it into the popup, or by right-clicking a link on a webpage and selecting *"Resolve with RedirectCheck"*.
- The redirect steps and final destination URL returned while resolving that link.
- Optional domain-registration and certificate-history details retrieved for the resolved domain when the user clicks *Check Domain Health*.

The extension also stores the following data **locally on the user's device** in browser extension storage:

- Resolved-link history (up to the last 50 entries).
- Cached domain-health snapshots tied to saved history entries.
- Theme preference (light or dark).

This locally stored data never leaves the user's device, is never sent to the developer, and is never sent to any third party.

## How the Information Is Used

RedirectCheck uses Website Content only to provide the extension's requested functionality:

- Resolve shortened URLs and follow their redirect chain.
- Display the redirect hops and the final destination.
- Optionally look up domain-registration and certificate-history details for the resolved domain.
- Save local history so the user can reopen previous results.

## Permissions and Justifications

The extension declares the minimum permissions needed for its single purpose. Each permission is justified below:

| Permission | Justification |
|---|---|
| `storage` | Used to persist resolved-link history, cached domain-health snapshots, and the user's theme preference in `chrome.storage.local`. All data stays on the user's device. |
| `contextMenus` | Used to register a *"Resolve with RedirectCheck"* item in the right-click menu when the user right-clicks a hyperlink. The menu entry only appears on link contexts and only fires when the user clicks it. |
| `host_permissions: <all_urls>` (`http://*/*` and `https://*/*`) | Required so the extension's background service worker can issue HTTP requests to arbitrary short-link destinations on the user's behalf. The extension only initiates these requests when the user explicitly asks it to resolve a URL or check a domain. The extension does not use content scripts, does not read the contents of pages the user visits, does not track browsing history, and does not modify any page. |

## Sharing and External Requests

The extension does **not** send Website Content to the developer or to developer-operated servers. The developer operates no servers and receives no telemetry of any kind.

To perform the features the user requests, the extension makes network requests directly from the user's browser to:

- The submitted URL and any sites involved in its redirect chain (only when the user submits a link to resolve).
- `rdap.org` (only when the user clicks *Check Domain Health*).
- `crt.sh` (only when the user clicks *Check Domain Health*).

These third-party services may receive the URL or domain needed to fulfill the user's request, in accordance with their own privacy policies. The extension sends only the URL or domain itself — no additional user identifiers, cookies set by the developer, or browsing history are transmitted.

## What the Extension Does Not Do

RedirectCheck does not:

- Collect, sell, transfer, or share personal information with the developer or any third party.
- Use user data for advertising, marketing, or creditworthiness assessment.
- Use user data for profiling beyond the extension's single-purpose functionality.
- Transfer user data to data brokers.
- Use content scripts, read page contents, or run code in the context of webpages the user visits.
- Track the user's browsing activity, history, or location.
- Collect personal communications, authentication credentials, financial information, health information, or precise location.

## Data Retention

Resolved-link history, cached domain-health snapshots, and theme preference remain stored locally on the user's device until the user clears the extension's storage, removes the extension, or otherwise clears that browser data. The developer does not retain any of this data on external servers.

## Security

The extension processes data locally where possible and only sends Website Content as needed to complete user-requested lookups. No method of transmission or storage is guaranteed to be completely secure, but the extension is designed to minimize data handling and avoid unnecessary collection.

## Changes to This Policy

If this privacy policy changes, the updated version will be posted with a new effective date.

## Contact

For privacy questions or support, use the contact information provided in the Chrome Web Store listing for RedirectCheck.
