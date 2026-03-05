export const HISTORY_STORAGE_KEY = "resolvedUrlHistory";
export const MAX_HISTORY_ENTRIES = 50;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function extractDisplayHost(urlValue) {
  if (!isNonEmptyString(urlValue)) {
    return "";
  }

  const trimmed = urlValue.trim();
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).hostname.toLowerCase();
  } catch (_error) {
    return "";
  }
}

function isResolvedEntry(entry) {
  return Boolean(
    entry &&
      isNonEmptyString(entry.id) &&
      isNonEmptyString(entry.inputUrl) &&
      isNonEmptyString(entry.resolvedAt) &&
      entry.result &&
      isNonEmptyString(entry.result.finalUrl)
  );
}

function cloneEntry(entry) {
  return {
    ...entry,
    result: entry?.result ? { ...entry.result, chain: Array.isArray(entry.result.chain) ? [...entry.result.chain] : [] } : {},
    domainHealth: entry?.domainHealth ? structuredClone(entry.domainHealth) : null
  };
}

export function sanitizeHistoryEntries(entries, maxEntries = MAX_HISTORY_ENTRIES) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const filtered = [];
  for (const entry of entries) {
    if (!isResolvedEntry(entry)) {
      continue;
    }
    filtered.push(cloneEntry(entry));
    if (filtered.length >= maxEntries) {
      break;
    }
  }
  return filtered;
}

export function prependResolvedEntry(entries, entry, maxEntries = MAX_HISTORY_ENTRIES) {
  if (!isResolvedEntry(entry)) {
    return sanitizeHistoryEntries(entries, maxEntries);
  }

  const normalizedExisting = sanitizeHistoryEntries(entries, maxEntries);
  const deduped = normalizedExisting.filter((item) => item.id !== entry.id);
  return sanitizeHistoryEntries([cloneEntry(entry), ...deduped], maxEntries);
}

export function updateHistoryEntryDomainHealth(entries, entryId, domainHealth) {
  const normalizedEntries = sanitizeHistoryEntries(entries);
  if (!isNonEmptyString(entryId)) {
    return normalizedEntries;
  }

  return normalizedEntries.map((entry) => {
    if (entry.id !== entryId) {
      return entry;
    }
    return {
      ...entry,
      domainHealth: domainHealth ? structuredClone(domainHealth) : null
    };
  });
}

export async function loadHistoryEntries(storageArea = chrome.storage.local) {
  const data = await storageArea.get(HISTORY_STORAGE_KEY);
  return sanitizeHistoryEntries(data?.[HISTORY_STORAGE_KEY]);
}

export async function saveHistoryEntries(entries, storageArea = chrome.storage.local) {
  const sanitized = sanitizeHistoryEntries(entries);
  await storageArea.set({ [HISTORY_STORAGE_KEY]: sanitized });
  return sanitized;
}
