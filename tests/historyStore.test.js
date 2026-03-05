import test from "node:test";
import assert from "node:assert/strict";

import {
  HISTORY_STORAGE_KEY,
  prependResolvedEntry,
  updateHistoryEntryDomainHealth,
  loadHistoryEntries,
  saveHistoryEntries,
  extractDisplayHost
} from "../src/historyStore.js";

function makeStorage(initial = {}) {
  const state = { ...initial };
  return {
    async get(key) {
      return { [key]: state[key] };
    },
    async set(patch) {
      Object.assign(state, patch);
    },
    dump() {
      return structuredClone(state);
    }
  };
}

function makeEntry(id, { inputUrl = "https://lnkd.in/x", finalUrl = "https://example.com" } = {}) {
  return {
    id,
    inputUrl,
    resolvedAt: "2026-03-04T10:00:00.000Z",
    result: {
      finalUrl,
      inputHost: "lnkd.in",
      finalHost: "example.com",
      hostChanged: true,
      hops: 1,
      chain: []
    },
    domainHealth: null
  };
}

test("prependResolvedEntry adds newest entries first and trims size", () => {
  const existing = [makeEntry("a"), makeEntry("b"), makeEntry("c")];
  const result = prependResolvedEntry(existing, makeEntry("new"), 3);
  assert.deepEqual(result.map((item) => item.id), ["new", "a", "b"]);
});

test("prependResolvedEntry ignores unresolved items", () => {
  const existing = [makeEntry("a")];
  const unresolved = {
    id: "bad",
    inputUrl: "https://tinyurl.com/nope",
    resolvedAt: "2026-03-04T10:00:00.000Z",
    result: {
      finalUrl: "",
      chain: []
    }
  };

  const result = prependResolvedEntry(existing, unresolved, 5);
  assert.deepEqual(result.map((item) => item.id), ["a"]);
});

test("updateHistoryEntryDomainHealth stores snapshot for matching entry", () => {
  const entries = [makeEntry("a"), makeEntry("b")];
  const domainHealth = {
    domain: "example.com",
    checkedAt: "2026-03-04T11:00:00.000Z",
    crtSh: { certificateCount: 1, firstSeen: null, lastSeen: null, commonNames: [], error: null },
    rdap: {
      registrationDate: "2020-01-01T00:00:00.000Z",
      lastChangedDate: null,
      expirationDate: null,
      status: [],
      registrar: "Example Registrar",
      error: null
    }
  };

  const result = updateHistoryEntryDomainHealth(entries, "b", domainHealth);
  assert.equal(result[0].domainHealth, null);
  assert.deepEqual(result[1].domainHealth, domainHealth);
});

test("loadHistoryEntries returns only resolved entries", async () => {
  const storage = makeStorage({
    [HISTORY_STORAGE_KEY]: [
      makeEntry("a"),
      {
        id: "bad",
        inputUrl: "https://tinyurl.com/nope",
        resolvedAt: "2026-03-04T10:00:00.000Z",
        result: { finalUrl: "", chain: [] }
      },
      makeEntry("b")
    ]
  });

  const result = await loadHistoryEntries(storage);
  assert.deepEqual(result.map((item) => item.id), ["a", "b"]);
});

test("saveHistoryEntries persists sanitized entries", async () => {
  const storage = makeStorage();
  await saveHistoryEntries(
    [
      makeEntry("a"),
      {
        id: "bad",
        inputUrl: "https://tinyurl.com/nope",
        resolvedAt: "2026-03-04T10:00:00.000Z",
        result: { finalUrl: "", chain: [] }
      }
    ],
    storage
  );

  const saved = storage.dump()[HISTORY_STORAGE_KEY];
  assert.deepEqual(saved.map((item) => item.id), ["a"]);
});

test("extractDisplayHost removes protocol/path but keeps subdomains", () => {
  assert.equal(extractDisplayHost("https://google.com/search?q=1"), "google.com");
  assert.equal(extractDisplayHost("http://github.com/CyberSecurityUP/Red-Team-Exercises"), "github.com");
  assert.equal(extractDisplayHost("https://docs.github.com/en/get-started"), "docs.github.com");
  assert.equal(extractDisplayHost("linkedin.com/in/someone"), "linkedin.com");
});
