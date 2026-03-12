import {
  loadHistoryEntries,
  saveHistoryEntries,
  prependResolvedEntry,
  updateHistoryEntryDomainHealth,
  extractDisplayHost
} from "../src/historyStore.js";
import { buildDisplayChainItems } from "../src/resultFormatting.js";
import { loadThemePreference, saveThemePreference, toggleThemePreference } from "../src/themePreference.js";

const appEl = document.querySelector("#app");
const mainContentEl = document.querySelector(".main-content");
const form = document.querySelector("#resolve-form");
const resolveButton = form.querySelector('button[type="submit"]');
const input = document.querySelector("#url-input");
const themeToggleButton = document.querySelector("#theme-toggle-button");
const statusEl = document.querySelector("#status");
const resultEl = document.querySelector("#result");
const finalUrlEl = document.querySelector("#final-url");
const hostCheckEl = document.querySelector("#host-check");
const chainEl = document.querySelector("#chain");

const historyToggleButton = document.querySelector("#history-toggle-button");
const historyPanel = document.querySelector("#history-panel");
const historyEmptyEl = document.querySelector("#history-empty");
const historyListEl = document.querySelector("#history-list");

const domainHealthButton = document.querySelector("#domain-health-button");
const domainHealthPanel = document.querySelector("#domain-health-panel");
const domainHealthSummaryEl = document.querySelector("#domain-health-summary");
const domainHealthLoadingEl = document.querySelector("#domain-health-loading");
const domainHealthContentEl = document.querySelector("#domain-health-content");
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

const HISTORY_BUTTON_SHOW = "History";
const HISTORY_BUTTON_HIDE = "Hide History";
const CHECK_BUTTON_LABEL = "Check Domain Health";
const HIDE_BUTTON_LABEL = "Hide Domain Health";
const UNKNOWN = "Unknown";

let currentResolvedDomain = null;
let activeHealthRequestId = 0;
let panelExpanded = false;
let historyPanelExpanded = false;
let historyEntries = [];
let selectedHistoryEntryId = null;
let themePreference = "light";

function applyThemePreference(nextPreference) {
  themePreference = nextPreference;
  document.documentElement.dataset.theme = nextPreference;
  const nextLabel = nextPreference === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggleButton.setAttribute("aria-label", nextLabel);
  themeToggleButton.setAttribute("title", nextLabel);
}

async function initializeThemePreference() {
  try {
    const storedThemePreference = await loadThemePreference();
    applyThemePreference(storedThemePreference);
  } catch (error) {
    applyThemePreference("light");
    const message = error instanceof Error ? error.message : "Unknown theme preference error";
    setStatus(`Theme preference unavailable: ${message}`, true);
  }

  themeToggleButton.addEventListener("click", async () => {
    try {
      const savedPreference = await saveThemePreference(toggleThemePreference(themePreference));
      applyThemePreference(savedPreference);
      if (statusEl.textContent.startsWith("Theme preference unavailable:")) {
        setStatus("");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown theme preference error";
      setStatus(`Theme preference unavailable: ${message}`, true);
    }
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function formatTimestamp(value) {
  if (!value) {
    return UNKNOWN;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return UNKNOWN;
  }
  return parsed.toLocaleString();
}

function resetList(element, items, emptyText) {
  element.innerHTML = "";
  const values = Array.isArray(items) && items.length > 0 ? items : [emptyText];
  for (const value of values) {
    const li = document.createElement("li");
    li.textContent = value;
    element.append(li);
  }
}

function setHistoryPanelExpanded(expanded) {
  historyPanelExpanded = expanded;
  appEl.classList.toggle("history-open", expanded);
  historyPanel.setAttribute("aria-hidden", expanded ? "false" : "true");
  if (expanded) {
    const measuredHeight = Math.max(120, Math.floor(mainContentEl.offsetHeight));
    historyPanel.style.height = `${measuredHeight}px`;
  } else {
    historyPanel.style.removeProperty("height");
  }
  historyToggleButton.textContent = expanded ? HISTORY_BUTTON_HIDE : HISTORY_BUTTON_SHOW;
}

function setHealthPanelExpanded(expanded) {
  panelExpanded = expanded;
  domainHealthPanel.hidden = !expanded;
  domainHealthButton.textContent = expanded ? HIDE_BUTTON_LABEL : CHECK_BUTTON_LABEL;
}

function resetHealthDisplay() {
  domainHealthSummaryEl.textContent = "";
  domainHealthLoadingEl.hidden = true;
  domainHealthLoadingEl.textContent = "Checking domain health...";
  domainHealthContentEl.hidden = true;

  crtCountEl.textContent = UNKNOWN;
  crtFirstSeenEl.textContent = UNKNOWN;
  crtLastSeenEl.textContent = UNKNOWN;
  crtDistinctNameCountEl.textContent = UNKNOWN;
  crtErrorEl.hidden = true;
  crtErrorEl.textContent = "";

  rdapRegistrationEl.textContent = UNKNOWN;
  rdapLastChangedEl.textContent = UNKNOWN;
  rdapExpirationEl.textContent = UNKNOWN;
  rdapRegistrarEl.textContent = UNKNOWN;
  rdapStatusEl.textContent = UNKNOWN;
  rdapErrorEl.hidden = true;
  rdapErrorEl.textContent = "";
}

function resetHealthForResolvedDomain(domain) {
  currentResolvedDomain = domain;
  activeHealthRequestId += 1;
  resetHealthDisplay();
  setHealthPanelExpanded(false);
  domainHealthButton.disabled = !domain;
}

function getSelectedHistoryEntry() {
  if (!selectedHistoryEntryId) {
    return null;
  }
  return historyEntries.find((entry) => entry.id === selectedHistoryEntryId) ?? null;
}

function renderHistoryList() {
  historyListEl.innerHTML = "";
  if (!Array.isArray(historyEntries) || historyEntries.length === 0) {
    historyEmptyEl.hidden = false;
    return;
  }

  historyEmptyEl.hidden = true;

  for (const entry of historyEntries) {
    const item = document.createElement("li");
    item.className = "history-item";
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.className = "history-row-button";
    loadButton.dataset.historyId = entry.id;
    if (entry.id === selectedHistoryEntryId) {
      loadButton.classList.add("selected");
    }

    const hostLabel = extractDisplayHost(entry.result?.finalUrl || entry.result?.finalHost || "");
    loadButton.textContent = hostLabel || "(unknown host)";

    item.append(loadButton);
    historyListEl.append(item);
  }
}

function renderResult(result) {
  finalUrlEl.href = result.finalUrl;
  finalUrlEl.textContent = result.finalUrl;

  if (result.hostChanged) {
    hostCheckEl.textContent = `Domain changed: ${result.inputHost} -> ${result.finalHost}`;
    hostCheckEl.classList.add("warn");
  } else {
    hostCheckEl.textContent = `Domain unchanged: ${result.finalHost}`;
    hostCheckEl.classList.remove("warn");
  }

  chainEl.innerHTML = "";
  for (const chainText of buildDisplayChainItems(result)) {
    const item = document.createElement("li");
    item.textContent = chainText;
    chainEl.append(item);
  }

  resetHealthForResolvedDomain(extractDisplayHost(result.finalUrl) || null);
  resultEl.hidden = false;
}

function renderHealthData(healthResult, fromCache = false) {
  const crtSh = healthResult?.crtSh ?? {};
  const rdap = healthResult?.rdap ?? {};
  const sourceText = fromCache ? "cached snapshot" : "live lookup";
  const riskLevel = healthResult?.risk?.level ?? "Unknown";
  const riskReasons = Array.isArray(healthResult?.risk?.reasons) ? healthResult.risk.reasons.slice(0, 2) : [];
  const riskText = riskReasons.length > 0 ? `Risk: ${riskLevel} (${riskReasons.join(" ")})` : `Risk: ${riskLevel}`;

  domainHealthSummaryEl.textContent = `${riskText} | Domain: ${healthResult.domain} | Checked: ${formatTimestamp(
    healthResult.checkedAt
  )} | Source: ${sourceText}`;
  domainHealthLoadingEl.hidden = true;
  domainHealthContentEl.hidden = false;

  crtCountEl.textContent = String(crtSh.certificateCount ?? 0);
  crtFirstSeenEl.textContent = formatTimestamp(crtSh.firstSeen);
  crtLastSeenEl.textContent = formatTimestamp(crtSh.lastSeen);
  crtDistinctNameCountEl.textContent = String(crtSh.distinctNameCount ?? 0);
  if (crtSh.error) {
    crtErrorEl.hidden = false;
    crtErrorEl.textContent = `crt.sh error: ${crtSh.error}`;
  } else {
    crtErrorEl.hidden = true;
    crtErrorEl.textContent = "";
  }

  rdapRegistrationEl.textContent = formatTimestamp(rdap.registrationDate);
  rdapLastChangedEl.textContent = formatTimestamp(rdap.lastChangedDate);
  rdapExpirationEl.textContent = formatTimestamp(rdap.expirationDate);
  rdapRegistrarEl.textContent = rdap.registrar || UNKNOWN;
  rdapStatusEl.textContent = Array.isArray(rdap.status) && rdap.status.length > 0 ? rdap.status.join(", ") : UNKNOWN;
  if (rdap.error) {
    rdapErrorEl.hidden = false;
    rdapErrorEl.textContent = `RDAP error: ${rdap.error}`;
  } else {
    rdapErrorEl.hidden = true;
    rdapErrorEl.textContent = "";
  }
}

function showHealthFailure(message) {
  domainHealthSummaryEl.textContent = `Domain: ${currentResolvedDomain}`;
  domainHealthLoadingEl.hidden = false;
  domainHealthLoadingEl.textContent = message;
  domainHealthContentEl.hidden = true;
}

function createHistoryEntry(inputUrl, result) {
  const id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return {
    id,
    inputUrl,
    resolvedAt: new Date().toISOString(),
    result: structuredClone(result),
    domainHealth: null
  };
}

async function refreshHistoryFromStorage() {
  historyEntries = await loadHistoryEntries();
  renderHistoryList();
}

async function persistHistoryEntries(nextEntries) {
  historyEntries = await saveHistoryEntries(nextEntries);
  renderHistoryList();
}

async function loadHistoryEntry(entryId) {
  const entry = historyEntries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  selectedHistoryEntryId = entry.id;
  input.value = entry.inputUrl;
  renderResult(entry.result);
  renderHistoryList();
  setStatus("Loaded from history.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  resultEl.hidden = true;
  selectedHistoryEntryId = null;
  renderHistoryList();
  setStatus("Resolving...");
  resetHealthForResolvedDomain(null);

  const url = input.value.trim();
  resolveButton.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ type: "resolve-url", url });
    if (!response || !response.ok) {
      throw new Error(response?.error || "Failed to resolve URL");
    }

    renderResult(response.result);
    setStatus("Resolved successfully.");

    const entry = createHistoryEntry(url, response.result);
    try {
      await persistHistoryEntries(prependResolvedEntry(historyEntries, entry));
      selectedHistoryEntryId = entry.id;
      renderHistoryList();
    } catch (historyError) {
      const message = historyError instanceof Error ? historyError.message : "Unknown history save error";
      setStatus(`Resolved, but history save failed: ${message}`, true);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setStatus(message, true);
  } finally {
    resolveButton.disabled = false;
  }
});

historyToggleButton.addEventListener("click", () => {
  setHistoryPanelExpanded(!historyPanelExpanded);
});

historyListEl.addEventListener("click", (event) => {
  const loadButton = event.target.closest("button[data-history-id]");
  if (!loadButton) {
    return;
  }

  const entryId = loadButton.dataset.historyId;
  if (!entryId) {
    return;
  }

  loadHistoryEntry(entryId);
});

domainHealthButton.addEventListener("click", async () => {
  if (!currentResolvedDomain) {
    return;
  }

  if (panelExpanded) {
    activeHealthRequestId += 1;
    setHealthPanelExpanded(false);
    return;
  }

  setHealthPanelExpanded(true);
  resetHealthDisplay();
  domainHealthSummaryEl.textContent = `Domain: ${currentResolvedDomain}`;

  const selectedEntry = getSelectedHistoryEntry();
  if (selectedEntry?.domainHealth && selectedEntry.domainHealth.domain === currentResolvedDomain) {
    renderHealthData(selectedEntry.domainHealth, true);
    return;
  }

  domainHealthLoadingEl.hidden = false;
  const requestId = ++activeHealthRequestId;
  const domain = currentResolvedDomain;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "check-domain-health",
      domain
    });

    if (requestId !== activeHealthRequestId || domain !== currentResolvedDomain) {
      return;
    }

    if (!response || !response.ok) {
      throw new Error(response?.error || "Failed to check domain health");
    }

    renderHealthData(response.result, false);

    const latestSelectedEntry = getSelectedHistoryEntry();
    if (latestSelectedEntry) {
      await persistHistoryEntries(updateHistoryEntryDomainHealth(historyEntries, latestSelectedEntry.id, response.result));
    }
  } catch (error) {
    if (requestId !== activeHealthRequestId || domain !== currentResolvedDomain) {
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    showHealthFailure(`Failed to load domain health: ${message}`);
  }
});

async function initialize() {
  await initializeThemePreference();
  resetHealthForResolvedDomain(null);
  setHistoryPanelExpanded(false);
  await refreshHistoryFromStorage();
}

initialize().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  setStatus(`Failed to load history: ${message}`, true);
});
