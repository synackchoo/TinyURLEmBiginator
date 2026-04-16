const SETTINGS_STORAGE_KEY = "extensionSettings";

const DEFAULTS = {
  maxHops: 10,
  timeoutMs: 8000,
  maxHistoryEntries: 50
};

const LIMITS = {
  maxHops: { min: 1, max: 50 },
  timeoutMs: { min: 1000, max: 60000 },
  maxHistoryEntries: { min: 5, max: 500 }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeSettings(raw) {
  const settings = { ...DEFAULTS };
  if (!raw || typeof raw !== "object") return settings;

  for (const key of Object.keys(DEFAULTS)) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      const { min, max } = LIMITS[key];
      settings[key] = clamp(Math.round(value), min, max);
    }
  }

  return settings;
}

export function getDefaults() {
  return { ...DEFAULTS };
}

export function getLimits() {
  return JSON.parse(JSON.stringify(LIMITS));
}

export async function loadSettings() {
  const data = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  return sanitizeSettings(data?.[SETTINGS_STORAGE_KEY]);
}

export async function saveSettings(settings) {
  const sanitized = sanitizeSettings(settings);
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: sanitized });
  return sanitized;
}
