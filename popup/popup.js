import {
  loadHistoryEntries,
  saveHistoryEntries,
  prependResolvedEntry,
  updateHistoryEntryDomainHealth,
  updateHistoryEntrySafeBrowsing,
  extractDisplayHost
} from "../src/historyStore.js";
import { loadThemePreference, saveThemePreference, toggleThemePreference } from "../src/themePreference.js";
import { loadApiKey, saveApiKey } from "../src/safeBrowsing.js";
import { loadSettings, saveSettings, getDefaults } from "../src/settingsStore.js";

/* ─── DOM ─────────────────────────────────────────── */

const appEl = document.querySelector("#app");
const form = document.querySelector("#resolve-form");
const input = document.querySelector("#url-input");
const resolveButton = document.querySelector("#resolve-button");
const statusEl = document.querySelector("#status");

const themeToggleButton = document.querySelector("#theme-toggle-button");
const settingsToggleButton = document.querySelector("#settings-toggle-button");
const settingsPanel = document.querySelector("#settings-panel");
const apiKeyInput = document.querySelector("#api-key-input");
const apiKeySaveButton = document.querySelector("#api-key-save");
const apiKeyStatusEl = document.querySelector("#api-key-status");
const maxHopsInput = document.querySelector("#settings-max-hops");
const timeoutInput = document.querySelector("#settings-timeout");
const maxHistoryInput = document.querySelector("#settings-max-history");
const limitsSaveButton = document.querySelector("#settings-limits-save");
const limitsResetButton = document.querySelector("#settings-limits-reset");
const limitsStatusEl = document.querySelector("#settings-limits-status");
const historyToggleButton = document.querySelector("#history-toggle-button");
const historyPanel = document.querySelector("#history-panel");
const historyEmptyEl = document.querySelector("#history-empty");
const historyListEl = document.querySelector("#history-list");

const resultEl = document.querySelector("#result");
const resultCardEl = document.querySelector("#result-card");
const resultIconEl = document.querySelector("#result-icon");
const hostChangedChip = document.querySelector("#host-changed-chip");
const safeBrowsingChip = document.querySelector("#safe-browsing-chip");
const finalHostEl = document.querySelector("#final-host");
const finalUrlEl = document.querySelector("#final-url");
const copyButton = document.querySelector("#copy-button");
const hopTrailToggle = document.querySelector("#hop-trail-toggle");
const hopTrailToggleLabel = document.querySelector("#hop-trail-toggle-label");
const hopTrailEl = document.querySelector("#hop-trail");

const domainHealthButton = document.querySelector("#domain-health-button");
const healthCardEl = document.querySelector("#health-card");
const healthLoadingEl = document.querySelector("#health-loading");
const healthContentEl = document.querySelector("#health-content");
const riskBadgeEl = document.querySelector("#risk-badge");
const riskReasonEl = document.querySelector("#risk-reason");
const healthDetailsToggle = document.querySelector("#health-details-toggle");
const healthDetailsEl = document.querySelector("#health-details");
const healthMetaEl = document.querySelector("#health-meta");

const crtCountEl = document.querySelector("#crt-count");
const crtFirstSeenEl = document.querySelector("#crt-first-seen");
const crtLastSeenEl = document.querySelector("#crt-last-seen");
const crtDistinctNameCountEl = document.querySelector("#crt-distinct-name-count");
const crtErrorEl = document.querySelector("#crt-error");

const rdapRegistrationEl = document.querySelector("#rdap-registration");
const rdapLastChangedEl = document.querySelector("#rdap-last-changed");
const rdapExpirationEl = document.querySelector("#rdap-expiration");
const rdapRegistrarEl = document.querySelector("#rdap-registrar");
const rdapStatusEl = document.querySelector("#rdap-status");
const rdapErrorEl = document.querySelector("#rdap-error");

const toastEl = document.querySelector("#toast");
const historyRowIconTemplate = document.querySelector("#history-row-icon-template");

const DASH = "—";
const PENDING_RESOLVE_KEY = "pendingResolveUrl";
const PENDING_RESOLVE_TTL_MS = 30_000;

/* ─── State ───────────────────────────────────────── */

let themePreference = "light";
let historyEntries = [];
let selectedHistoryEntryId = null;
let currentResolvedDomain = null;
let activeHealthRequestId = 0;
let activeSafeBrowsingRequestId = 0;
let cachedApiKey = null;
let currentSettings = getDefaults();
let toastTimer = null;

/* ─── Status & toast ─────────────────────────────── */

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
    setTimeout(() => { toastEl.hidden = true; }, 200);
  }, 1100);
}

/* ─── Theme ──────────────────────────────────────── */

function applyThemePreference(next) {
  themePreference = next;
  document.documentElement.dataset.theme = next;
  const label = next === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggleButton.setAttribute("aria-label", label);
  themeToggleButton.setAttribute("title", label);
}

async function initTheme() {
  try {
    applyThemePreference(await loadThemePreference());
  } catch (error) {
    applyThemePreference("light");
    setStatus(`Theme unavailable: ${errorText(error)}`, true);
  }
  themeToggleButton.addEventListener("click", async () => {
    try {
      const saved = await saveThemePreference(toggleThemePreference(themePreference));
      applyThemePreference(saved);
      if (statusEl.textContent.startsWith("Theme unavailable:")) setStatus("");
    } catch (error) {
      setStatus(`Theme unavailable: ${errorText(error)}`, true);
    }
  });
}

/* ─── Toggle panel helper ───────────────────────── */

function createPanelToggle(className, panel, toggleButton, openLabel, closedLabel) {
  function set(open) {
    appEl.classList.toggle(className, open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    toggleButton.setAttribute("aria-expanded", open ? "true" : "false");
    const label = open ? openLabel : closedLabel;
    toggleButton.setAttribute("aria-label", label);
    toggleButton.setAttribute("title", label);
  }
  toggleButton.addEventListener("click", () => {
    set(!appEl.classList.contains(className));
  });
  return set;
}

/* ─── Settings panel ────────────────────────────── */

const setSettingsOpen = createPanelToggle(
  "settings-open", settingsPanel, settingsToggleButton,
  "Hide settings", "Show settings"
);

apiKeyInput.addEventListener("focus", () => {
  if (apiKeyInput.value === "••••••••••••••••") {
    apiKeyInput.value = "";
  }
});

apiKeySaveButton.addEventListener("click", async () => {
  const raw = apiKeyInput.value.trim();
  const isMasked = raw === "••••••••••••••••";
  if (isMasked) return;
  try {
    cachedApiKey = await saveApiKey(raw || null);
    apiKeyInput.value = cachedApiKey ? "••••••••••••••••" : "";
    apiKeyStatusEl.textContent = cachedApiKey ? "Key saved." : "Key removed.";
    apiKeyStatusEl.className = "settings-status saved";
  } catch (error) {
    apiKeyStatusEl.textContent = `Save failed: ${errorText(error)}`;
    apiKeyStatusEl.className = "settings-status error";
  }
});

function populateLimitsInputs(settings) {
  maxHopsInput.value = settings.maxHops;
  timeoutInput.value = settings.timeoutMs;
  maxHistoryInput.value = settings.maxHistoryEntries;
}

limitsSaveButton.addEventListener("click", async () => {
  try {
    currentSettings = await saveSettings({
      maxHops: Number(maxHopsInput.value),
      timeoutMs: Number(timeoutInput.value),
      maxHistoryEntries: Number(maxHistoryInput.value)
    });
    populateLimitsInputs(currentSettings);
    limitsStatusEl.textContent = "Settings saved.";
    limitsStatusEl.className = "settings-status saved";
  } catch (error) {
    limitsStatusEl.textContent = `Save failed: ${errorText(error)}`;
    limitsStatusEl.className = "settings-status error";
  }
});

limitsResetButton.addEventListener("click", async () => {
  try {
    currentSettings = await saveSettings(getDefaults());
    populateLimitsInputs(currentSettings);
    limitsStatusEl.textContent = "Defaults restored.";
    limitsStatusEl.className = "settings-status saved";
  } catch (error) {
    limitsStatusEl.textContent = `Reset failed: ${errorText(error)}`;
    limitsStatusEl.className = "settings-status error";
  }
});

async function initSettings() {
  setSettingsOpen(false);
  try {
    cachedApiKey = await loadApiKey();
    if (cachedApiKey) {
      apiKeyInput.value = "••••••••••••••••";
      apiKeyStatusEl.textContent = "Key configured.";
      apiKeyStatusEl.className = "settings-status saved";
    }
  } catch (_error) {
    cachedApiKey = null;
  }
  try {
    currentSettings = await loadSettings();
  } catch (_error) {
    currentSettings = getDefaults();
  }
  populateLimitsInputs(currentSettings);
}

/* ─── Safe Browsing ─────────────────────────────── */

function setSafeBrowsingChip(state, text) {
  safeBrowsingChip.hidden = false;
  safeBrowsingChip.className = "chip " + state;
  safeBrowsingChip.textContent = text;
}

function resetSafeBrowsingChip() {
  activeSafeBrowsingRequestId += 1;
  safeBrowsingChip.hidden = true;
  safeBrowsingChip.className = "chip";
  safeBrowsingChip.textContent = "";
}

function renderSafeBrowsingResult(result) {
  if (result.safe) {
    setSafeBrowsingChip("chip-safe", "No threats");
  } else {
    const labels = result.threats.map((t) => t.label);
    const unique = [...new Set(labels)];
    setSafeBrowsingChip("chip-threat", unique.join(", "));
  }
}

async function runSafeBrowsingCheck(inputUrl, finalUrl) {
  if (!cachedApiKey) return;

  const selected = getSelectedHistoryEntry();
  if (selected?.safeBrowsing) {
    renderSafeBrowsingResult(selected.safeBrowsing);
    return;
  }

  const urls = [...new Set([inputUrl, finalUrl].filter(Boolean))];
  if (urls.length === 0) return;

  setSafeBrowsingChip("chip-sb-checking", "Checking\u2026");
  const requestId = ++activeSafeBrowsingRequestId;

  try {
    const response = await chrome.runtime.sendMessage({ type: "check-safe-browsing", urls });
    if (requestId !== activeSafeBrowsingRequestId) return;
    if (!response || !response.ok) throw new Error(response?.error || "Check failed");

    renderSafeBrowsingResult(response.result);

    const latest = getSelectedHistoryEntry();
    if (latest) {
      await persistHistory(updateHistoryEntrySafeBrowsing(historyEntries, latest.id, response.result));
    }
  } catch (error) {
    if (requestId !== activeSafeBrowsingRequestId) return;
    setSafeBrowsingChip("chip-sb-error", "SB error");
    safeBrowsingChip.title = errorText(error);
  }
}

/* ─── History drawer ─────────────────────────────── */

const setHistoryOpen = createPanelToggle(
  "history-open", historyPanel, historyToggleButton,
  "Hide history", "Show history"
);

function renderHistoryList() {
  historyListEl.textContent = "";
  if (!historyEntries.length) {
    historyEmptyEl.hidden = false;
    return;
  }
  historyEmptyEl.hidden = true;

  const fragment = document.createDocumentFragment();
  const iconSource = historyRowIconTemplate.content.firstElementChild;

  for (const entry of historyEntries) {
    const li = document.createElement("li");
    li.className = "history-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-row-button";
    button.dataset.historyId = entry.id;
    if (entry.id === selectedHistoryEntryId) button.classList.add("selected");

    const host = document.createElement("span");
    host.className = "history-row-host";
    host.textContent = extractDisplayHost(entry.result?.finalUrl || "") || "(unknown)";

    const time = document.createElement("span");
    time.className = "history-row-time";
    time.textContent = relativeTime(entry.resolvedAt);

    button.append(iconSource.cloneNode(true), host, time);

    const riskLevel = entry.domainHealth?.risk?.level;
    if (riskLevel && riskLevel !== "Unknown") {
      const dot = document.createElement("span");
      dot.className = `history-row-risk ${riskLevel.toLowerCase()}`;
      button.append(dot);
    }

    li.append(button);
    fragment.append(li);
  }

  historyListEl.append(fragment);
}

historyListEl.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-history-id]");
  if (!button) return;
  loadHistoryEntry(button.dataset.historyId);
});

async function loadHistoryEntry(entryId) {
  const entry = historyEntries.find((item) => item.id === entryId);
  if (!entry) return;
  selectedHistoryEntryId = entry.id;
  input.value = entry.inputUrl;
  renderResult(entry.result);
  renderHistoryList();
  setStatus("Loaded from history.");
  runSafeBrowsingCheck(entry.result?.inputUrl, entry.result?.finalUrl);
}

async function refreshHistory() {
  historyEntries = await loadHistoryEntries();
  renderHistoryList();
}

async function persistHistory(next) {
  historyEntries = await saveHistoryEntries(next);
  renderHistoryList();
}

/* ─── Result rendering ───────────────────────────── */

function renderResult(result) {
  resultCardEl.classList.remove("error", "loading");
  resultEl.hidden = false;
  const displayHost = result.finalHost || extractDisplayHost(result.finalUrl) || "";
  finalHostEl.textContent = displayHost || DASH;
  finalUrlEl.href = result.finalUrl;
  finalUrlEl.textContent = result.finalUrl;
  finalUrlEl.title = result.finalUrl;
  hostChangedChip.hidden = !result.hostChanged;
  resetSafeBrowsingChip();
  resultIconEl.classList.remove("risk-low", "risk-medium", "risk-high");
  renderHopTrail(result);
  resetHealthForResolvedDomain(displayHost || null);
}

function renderHopTrail(result) {
  hopTrailEl.innerHTML = "";
  hopTrailEl.hidden = true;
  hopTrailToggle.setAttribute("aria-expanded", "false");

  const chain = Array.isArray(result.chain) ? result.chain : [];
  const visibleSteps = chain.filter((step) => step?.nextUrl || step?.finalUrl);

  if (visibleSteps.length === 0) {
    hopTrailToggle.hidden = true;
    return;
  }

  hopTrailToggle.hidden = false;
  const hopCount = visibleSteps.length;
  hopTrailToggleLabel.textContent = `↳ ${hopCount} hop${hopCount === 1 ? "" : "s"} · show trail`;

  for (const step of visibleSteps) {
    const li = document.createElement("li");
    li.className = "hop";

    const status = document.createElement("span");
    status.className = "hop-status " + classifyStatus(step.status);
    status.textContent = String(step.status ?? "—");

    const method = document.createElement("span");
    method.className = "hop-method";
    method.textContent = step.method || "";

    const url = document.createElement("span");
    url.className = "hop-url";
    url.title = step.nextUrl || step.finalUrl || step.url || "";
    url.textContent = step.nextUrl || step.finalUrl || step.url || "";

    li.append(status, method, url);

    if (step.finalUrl && !step.nextUrl) {
      const note = document.createElement("span");
      note.className = "hop-footnote";
      note.textContent = "extracted from interstitial";
      li.append(note);
    }

    hopTrailEl.append(li);
  }
}

function classifyStatus(status) {
  if (typeof status !== "number") return "";
  if (status >= 300 && status < 400) return "";
  if (status >= 400) return "error";
  return "success";
}

hopTrailToggle.addEventListener("click", () => {
  const expanded = hopTrailToggle.getAttribute("aria-expanded") === "true";
  const next = !expanded;
  hopTrailToggle.setAttribute("aria-expanded", String(next));
  hopTrailEl.hidden = !next;
  const count = hopTrailEl.children.length;
  hopTrailToggleLabel.textContent = next
    ? `↳ ${count} hop${count === 1 ? "" : "s"} · hide trail`
    : `↳ ${count} hop${count === 1 ? "" : "s"} · show trail`;
});

/* ─── Copy button ────────────────────────────────── */

copyButton.addEventListener("click", async () => {
  const value = finalUrlEl.href;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied");
  } catch (_error) {
    showToast("Copy failed");
  }
});

finalUrlEl.addEventListener("click", (event) => {
  if (!finalUrlEl.href) event.preventDefault();
});

/* ─── Resolve form ───────────────────────────────── */

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  if (!url) return;

  resultEl.hidden = false;
  resultCardEl.classList.remove("error");
  resultCardEl.classList.add("loading");
  hostChangedChip.hidden = true;
  resetSafeBrowsingChip();
  hopTrailToggle.hidden = true;
  hopTrailEl.hidden = true;
  selectedHistoryEntryId = null;
  setStatus("Resolving…");
  resetHealthForResolvedDomain(null);
  resolveButton.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: "resolve-url", url });
    if (!response || !response.ok) throw new Error(response?.error || "Failed to resolve URL");
    renderResult(response.result);
    setStatus("");
    runSafeBrowsingCheck(response.result.inputUrl, response.result.finalUrl);

    const entry = createHistoryEntry(url, response.result);
    try {
      await persistHistory(prependResolvedEntry(historyEntries, entry, currentSettings.maxHistoryEntries));
      selectedHistoryEntryId = entry.id;
      renderHistoryList();
    } catch (historyError) {
      setStatus(`Resolved, but history save failed: ${errorText(historyError)}`, true);
    }
  } catch (error) {
    showResolveError(errorText(error));
  } finally {
    resolveButton.disabled = false;
  }
});

function showResolveError(message) {
  resultCardEl.classList.remove("loading");
  resultCardEl.classList.add("error");
  resultEl.hidden = false;
  finalHostEl.textContent = "Couldn't resolve";
  finalUrlEl.href = "";
  finalUrlEl.textContent = message;
  finalUrlEl.title = message;
  hostChangedChip.hidden = true;
  resetSafeBrowsingChip();
  hopTrailToggle.hidden = true;
  hopTrailEl.hidden = true;
  resetHealthForResolvedDomain(null);
  setStatus("");
}

function createHistoryEntry(inputUrl, result) {
  const id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return {
    id,
    inputUrl,
    resolvedAt: new Date().toISOString(),
    result: structuredClone(result),
    domainHealth: null,
    safeBrowsing: null
  };
}

/* ─── Domain Health ──────────────────────────────── */

function resetHealthForResolvedDomain(domain) {
  currentResolvedDomain = domain;
  activeHealthRequestId += 1;
  domainHealthButton.disabled = !domain;
  domainHealthButton.textContent = "Check Domain Health";
  healthCardEl.hidden = true;
  healthLoadingEl.hidden = true;
  healthContentEl.hidden = true;
  healthDetailsEl.hidden = true;
  healthDetailsToggle.setAttribute("aria-expanded", "false");
  healthDetailsToggle.textContent = "Show certificate & registration details";
  resultIconEl.classList.remove("risk-low", "risk-medium", "risk-high");
}

domainHealthButton.addEventListener("click", async () => {
  if (!currentResolvedDomain) return;
  if (!healthCardEl.hidden) {
    activeHealthRequestId += 1;
    healthCardEl.hidden = true;
    domainHealthButton.textContent = "Check Domain Health";
    return;
  }

  healthCardEl.hidden = false;
  healthLoadingEl.hidden = false;
  healthContentEl.hidden = true;
  domainHealthButton.textContent = "Hide Domain Health";

  const selected = getSelectedHistoryEntry();
  if (selected?.domainHealth && selected.domainHealth.domain === currentResolvedDomain) {
    renderHealthData(selected.domainHealth, true);
    return;
  }

  const requestId = ++activeHealthRequestId;
  const domain = currentResolvedDomain;

  try {
    const response = await chrome.runtime.sendMessage({ type: "check-domain-health", domain });
    if (requestId !== activeHealthRequestId || domain !== currentResolvedDomain) return;
    if (!response || !response.ok) throw new Error(response?.error || "Failed to check domain health");
    renderHealthData(response.result, false);

    const latest = getSelectedHistoryEntry();
    if (latest) {
      await persistHistory(updateHistoryEntryDomainHealth(historyEntries, latest.id, response.result));
    }
  } catch (error) {
    if (requestId !== activeHealthRequestId || domain !== currentResolvedDomain) return;
    healthLoadingEl.hidden = false;
    healthLoadingEl.querySelector(".health-loading-text").textContent = `Failed: ${errorText(error)}`;
  }
});

healthDetailsToggle.addEventListener("click", () => {
  const expanded = healthDetailsToggle.getAttribute("aria-expanded") === "true";
  const next = !expanded;
  healthDetailsToggle.setAttribute("aria-expanded", String(next));
  healthDetailsEl.hidden = !next;
  healthDetailsToggle.textContent = next
    ? "Hide certificate & registration details"
    : "Show certificate & registration details";
});

function renderHealthData(health, fromCache) {
  healthLoadingEl.hidden = true;
  healthContentEl.hidden = false;

  const level = health?.risk?.level ?? "Unknown";
  const levelClass = level.toLowerCase();
  riskBadgeEl.textContent = level.toUpperCase();
  riskBadgeEl.classList.remove("low", "medium", "high", "unknown");
  riskBadgeEl.classList.add(levelClass);

  const reasons = Array.isArray(health?.risk?.reasons) ? health.risk.reasons : [];
  riskReasonEl.textContent = reasons[0] || "No risk signals available.";

  resultIconEl.classList.remove("risk-low", "risk-medium", "risk-high");
  if (level !== "Unknown") {
    resultIconEl.classList.add(`risk-${levelClass}`);
  }

  const crt = health?.crtSh ?? {};
  crtCountEl.textContent = String(crt.certificateCount ?? 0);
  crtFirstSeenEl.textContent = formatDate(crt.firstSeen);
  crtLastSeenEl.textContent = formatDate(crt.lastSeen);
  crtDistinctNameCountEl.textContent = String(crt.distinctNameCount ?? 0);
  toggleError(crtErrorEl, crt.error && `crt.sh: ${crt.error}`);

  const rdap = health?.rdap ?? {};
  rdapRegistrationEl.textContent = formatDate(rdap.registrationDate);
  rdapLastChangedEl.textContent = formatDate(rdap.lastChangedDate);
  rdapExpirationEl.textContent = formatDate(rdap.expirationDate);
  rdapRegistrarEl.textContent = rdap.registrar || DASH;
  rdapStatusEl.textContent = Array.isArray(rdap.status) && rdap.status.length ? rdap.status.join(", ") : DASH;
  toggleError(rdapErrorEl, rdap.error && `RDAP: ${rdap.error}`);

  healthMetaEl.textContent = `${health.domain} · ${fromCache ? "cached" : "live"} · checked ${formatDate(health.checkedAt)}`;
}

function toggleError(element, message) {
  if (message) {
    element.hidden = false;
    element.textContent = message;
  } else {
    element.hidden = true;
    element.textContent = "";
  }
}

function getSelectedHistoryEntry() {
  if (!selectedHistoryEntryId) return null;
  return historyEntries.find((entry) => entry.id === selectedHistoryEntryId) ?? null;
}

/* ─── Formatters ─────────────────────────────────── */

function formatDate(value) {
  if (!value) return DASH;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return DASH;
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function relativeTime(value) {
  if (!value) return "";
  const then = new Date(value).valueOf();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function errorText(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

/* ─── Pending resolve (from context menu) ────────── */

async function consumePendingResolve() {
  let stored;
  try {
    stored = await chrome.storage.local.get(PENDING_RESOLVE_KEY);
  } catch (_error) {
    return;
  }
  const pending = stored?.[PENDING_RESOLVE_KEY];
  if (!pending || typeof pending.url !== "string") {
    return;
  }

  await chrome.storage.local.remove(PENDING_RESOLVE_KEY);

  const requestedAt = Number(pending.requestedAt) || 0;
  if (Date.now() - requestedAt > PENDING_RESOLVE_TTL_MS) {
    return;
  }

  input.value = pending.url;
  form.requestSubmit();
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[PENDING_RESOLVE_KEY]?.newValue) {
    return;
  }
  consumePendingResolve();
});

/* ─── Init ───────────────────────────────────────── */

async function init() {
  await Promise.all([initTheme(), initSettings(), refreshHistory()]);
  resetHealthForResolvedDomain(null);
  setHistoryOpen(false);
  await consumePendingResolve();
}

init().catch((error) => {
  setStatus(`Failed to load: ${errorText(error)}`, true);
});
