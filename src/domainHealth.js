const EMPTY_CRTSH_SUMMARY = {
  certificateCount: 0,
  firstSeen: null,
  lastSeen: null,
  commonNames: [],
  error: null
};

const EMPTY_RDAP_SUMMARY = {
  registrationDate: null,
  lastChangedDate: null,
  expirationDate: null,
  status: [],
  registrar: null,
  error: null
};

function normalizeDomain(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error("A valid domain is required.");
  }

  const trimmed = input.trim();
  let hostname = trimmed;

  if (trimmed.includes("://")) {
    hostname = new URL(trimmed).hostname;
  } else {
    hostname = trimmed.replace(/^https?:\/\//i, "").split("/")[0];
  }

  hostname = hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || !hostname.includes(".")) {
    throw new Error("A valid domain is required.");
  }

  return hostname;
}

function parseIsoTimestamp(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed.toISOString();
}

function extractCommonNames(entry) {
  const names = [];
  if (typeof entry?.common_name === "string") {
    names.push(entry.common_name);
  }
  if (typeof entry?.name_value === "string") {
    names.push(...entry.name_value.split("\n"));
  }

  return names
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export function summarizeCrtShCertificates(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { ...EMPTY_CRTSH_SUMMARY };
  }

  const timestamps = [];
  const commonNameSet = new Set();

  for (const entry of entries) {
    const ts = parseIsoTimestamp(entry?.entry_timestamp);
    if (ts) {
      timestamps.push(ts);
    }

    for (const name of extractCommonNames(entry)) {
      commonNameSet.add(name);
    }
  }

  timestamps.sort();

  return {
    certificateCount: entries.length,
    firstSeen: timestamps.length > 0 ? timestamps[0] : null,
    lastSeen: timestamps.length > 0 ? timestamps[timestamps.length - 1] : null,
    commonNames: [...commonNameSet].sort(),
    error: null
  };
}

function findEventDate(record, actions) {
  if (!Array.isArray(record?.events)) {
    return null;
  }

  for (const event of record.events) {
    const actionCandidate = typeof event?.action === "string" ? event.action : event?.eventAction;
    const action = typeof actionCandidate === "string" ? actionCandidate.toLowerCase() : "";
    if (actions.includes(action)) {
      return parseIsoTimestamp(event.eventDate);
    }
  }

  return null;
}

function extractRegistrar(record) {
  if (!Array.isArray(record?.entities)) {
    return null;
  }

  for (const entity of record.entities) {
    const roles = Array.isArray(entity?.roles) ? entity.roles.map((role) => String(role).toLowerCase()) : [];
    if (!roles.includes("registrar")) {
      continue;
    }

    const vcardItems = Array.isArray(entity?.vcardArray) ? entity.vcardArray[1] : null;
    if (!Array.isArray(vcardItems)) {
      continue;
    }

    for (const item of vcardItems) {
      if (!Array.isArray(item) || item.length < 4) {
        continue;
      }
      const field = String(item[0]).toLowerCase();
      const value = item[3];
      if ((field === "fn" || field === "org") && typeof value === "string" && value.trim() !== "") {
        return value.trim();
      }
    }
  }

  return null;
}

export function summarizeRdapRecord(record) {
  return {
    registrationDate: findEventDate(record, ["registration", "registered"]),
    lastChangedDate: findEventDate(record, ["last changed", "last update of rdap database"]),
    expirationDate: findEventDate(record, ["expiration", "expiry"]),
    status: Array.isArray(record?.status) ? record.status : [],
    registrar: extractRegistrar(record),
    error: null
  };
}

async function fetchCrtShSummary(domain, fetchImpl) {
  const response = await fetchImpl(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, {
    method: "GET",
    redirect: "follow",
    cache: "no-store"
  });
  if (!response?.ok) {
    throw new Error(`crt.sh request failed (${response?.status ?? "unknown"})`);
  }

  const payload = await response.json();
  return summarizeCrtShCertificates(Array.isArray(payload) ? payload : []);
}

async function fetchRdapSummary(domain, fetchImpl) {
  const response = await fetchImpl(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    method: "GET",
    redirect: "follow",
    cache: "no-store"
  });
  if (!response?.ok) {
    throw new Error(`RDAP request failed (${response?.status ?? "unknown"})`);
  }

  const payload = await response.json();
  return summarizeRdapRecord(payload);
}

function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

export async function getDomainHealth(domainInput, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("A valid fetch implementation is required.");
  }

  const domain = normalizeDomain(domainInput);

  const [crtShResult, rdapResult] = await Promise.allSettled([
    fetchCrtShSummary(domain, fetchImpl),
    fetchRdapSummary(domain, fetchImpl)
  ]);

  const crtSh =
    crtShResult.status === "fulfilled"
      ? crtShResult.value
      : { ...EMPTY_CRTSH_SUMMARY, error: errorMessage(crtShResult.reason, "crt.sh request failed") };

  const rdap =
    rdapResult.status === "fulfilled"
      ? rdapResult.value
      : { ...EMPTY_RDAP_SUMMARY, error: errorMessage(rdapResult.reason, "RDAP request failed") };

  return {
    domain,
    crtSh,
    rdap,
    checkedAt: new Date().toISOString()
  };
}
