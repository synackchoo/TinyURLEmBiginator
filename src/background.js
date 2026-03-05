import { resolveUrl } from "./resolver.js";
import { getDomainHealth } from "./domainHealth.js";

function respondWith(promise, sendResponse) {
  promise
    .then((result) => {
      sendResponse({ ok: true, result });
    })
    .catch((error) => {
      const messageText = error instanceof Error ? error.message : "Unknown error";
      sendResponse({ ok: false, error: messageText });
    });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  if (message.type === "resolve-url") {
    respondWith(resolveUrl(message.url), sendResponse);
    return true;
  }

  if (message.type === "check-domain-health") {
    respondWith(getDomainHealth(message.domain), sendResponse);
    return true;
  }

  return false;
});
