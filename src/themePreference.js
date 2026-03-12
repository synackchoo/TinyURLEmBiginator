export const THEME_PREFERENCE_STORAGE_KEY = "popupThemePreference";

const VALID_THEME_PREFERENCES = new Set(["light", "dark"]);

function normalizeThemePreference(value) {
  return VALID_THEME_PREFERENCES.has(value) ? value : "light";
}

export function toggleThemePreference(value) {
  return normalizeThemePreference(value) === "dark" ? "light" : "dark";
}

export async function loadThemePreference(storageArea = chrome.storage.local) {
  const data = await storageArea.get(THEME_PREFERENCE_STORAGE_KEY);
  return normalizeThemePreference(data?.[THEME_PREFERENCE_STORAGE_KEY]);
}

export async function saveThemePreference(value, storageArea = chrome.storage.local) {
  const normalized = normalizeThemePreference(value);
  await storageArea.set({ [THEME_PREFERENCE_STORAGE_KEY]: normalized });
  return normalized;
}
