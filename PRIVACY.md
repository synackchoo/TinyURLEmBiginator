# Privacy Policy for Tiny URL EmBiginator

Effective date: March 13, 2026

Tiny URL EmBiginator is a Chrome extension that reveals where shortened URLs lead without opening them in a new tab.

## Scope

For Chrome Web Store disclosure purposes, the only user data this extension processes is **Website Content**. In this extension, "Website Content" means the URL or link content a user submits for analysis, along with the redirect-chain and destination information needed to show where that link leads.

## Information the Extension Processes

The extension processes the following Website Content only when a user asks it to resolve a link:

- The URL or link content entered into the extension.
- The redirect steps and final destination URL returned while resolving that link.
- Optional domain details retrieved for the resolved domain when the user uses the domain-health feature.

The extension also stores the following data locally on the user's device:

- Resolved-link history.
- Cached domain-health snapshots tied to saved history entries.
- Theme preference.

This locally stored data is kept in the browser's extension storage and is not sent to the developer.

## How the Information Is Used

Tiny URL EmBiginator uses Website Content only to provide the extension's requested functionality:

- Resolve shortened URLs.
- Display redirect hops and the final destination.
- Optionally look up domain-registration and certificate-history details for the resolved domain.
- Save local history so the user can reopen previous results.

## Sharing and External Requests

The extension does **not** send Website Content to the developer or to developer-operated servers.

To perform the features the user requests, the extension makes network requests directly from the user's browser to:

- The submitted URL and any sites involved in its redirect chain.
- `rdap.org` when the user requests domain-registration details.
- `crt.sh` when the user requests certificate-history details.

Those services may receive the URL or domain needed to fulfill the user's request.

## What the Extension Does Not Do

Tiny URL EmBiginator does not:

- Collect or sell personal information to the developer.
- Use user data for advertising or marketing.
- Use user data for profiling beyond the extension's single-purpose functionality.
- Transfer user data to data brokers.
- Collect unrelated browsing history, precise location, payment information, health information, personal communications, or authentication credentials.

## Data Retention

Resolved-link history, cached domain-health data, and theme preference remain stored locally on the user's device until the user clears the extension's storage, removes the extension, or otherwise clears that browser data. The developer does not retain this data on external servers.

## Security

The extension processes data locally where possible and only sends Website Content as needed to complete user-requested lookups. No method of transmission or storage is guaranteed to be completely secure, but the extension is designed to minimize data handling and avoid unnecessary collection.

## Changes to This Policy

If this privacy policy changes, the updated version will be posted with a new effective date.

## Contact

For privacy questions or support, use the contact information provided in the Chrome Web Store listing for Tiny URL EmBiginator.
