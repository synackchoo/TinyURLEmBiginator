const SAFE_BROWSING_API_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find";
const API_KEY_STORAGE_KEY = "safeBrowsingApiKey";

const THREAT_TYPES = [
  "MALWARE",
  "SOCIAL_ENGINEERING",
  "UNWANTED_SOFTWARE",
  "POTENTIALLY_HARMFUL_APPLICATION"
];

const THREAT_LABELS = {
  MALWARE: "Malware",
  SOCIAL_ENGINEERING: "Phishing",
  UNWANTED_SOFTWARE: "Unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "Harmful application"
};

export async function loadApiKey() {
  const result = await chrome.storage.local.get(API_KEY_STORAGE_KEY);
  return result[API_KEY_STORAGE_KEY] || null;
}

export async function saveApiKey(key) {
  if (!key || typeof key !== "string" || key.trim() === "") {
    await chrome.storage.local.remove(API_KEY_STORAGE_KEY);
    return null;
  }
  const trimmed = key.trim();
  await chrome.storage.local.set({ [API_KEY_STORAGE_KEY]: trimmed });
  return trimmed;
}

export async function checkSafeBrowsing(urls, apiKey, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new Error("Safe Browsing API key is not configured.");
  }

  const urlList = (Array.isArray(urls) ? urls : [urls])
    .filter((u) => typeof u === "string" && u.trim() !== "");

  if (urlList.length === 0) {
    throw new Error("No URLs to check.");
  }

  const body = {
    client: {
      clientId: "redirect-check",
      clientVersion: "0.3.0"
    },
    threatInfo: {
      threatTypes: THREAT_TYPES,
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urlList.map((url) => ({ url }))
    }
  };

  const response = await fetchImpl(
    `${SAFE_BROWSING_API_URL}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      throw new Error("Invalid or unauthorized API key.");
    }
    throw new Error(`Safe Browsing API error (${response.status}).`);
  }

  const data = await response.json();
  const matches = Array.isArray(data.matches) ? data.matches : [];

  const threats = matches.map((match) => ({
    url: match.threat?.url || "",
    type: match.threatType || "UNKNOWN",
    label: THREAT_LABELS[match.threatType] || match.threatType || "Unknown threat"
  }));

  return {
    safe: threats.length === 0,
    threats,
    urlsChecked: urlList.length,
    checkedAt: new Date().toISOString()
  };
}
