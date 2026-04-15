import { resolveUrl } from "./resolver.js";
import { getDomainHealth } from "./domainHealth.js";

const CONTEXT_MENU_ID = "tiny-url-embiginator-resolve-link";
const PENDING_RESOLVE_KEY = "pendingResolveUrl";

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

function registerContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Resolve with Tiny URL EmBiginator",
      contexts: ["link"]
    });
  });
}

chrome.runtime.onInstalled.addListener(registerContextMenu);
chrome.runtime.onStartup.addListener(registerContextMenu);

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !info.linkUrl) {
    return;
  }

  await chrome.storage.local.set({
    [PENDING_RESOLVE_KEY]: { url: info.linkUrl, requestedAt: Date.now() }
  });

  try {
    await chrome.action.openPopup();
  } catch (_error) {
    // openPopup is unsupported in some browsers/versions; the pending URL
    // will be consumed the next time the user opens the popup manually.
  }
});
