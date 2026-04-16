const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);
const HEAD_FALLBACK_STATUS_CODES = new Set([405, 501]);
const DEFAULT_MAX_HOPS = 10;
const DEFAULT_TIMEOUT_MS = 8000;
const LINKEDIN_INTERSTITIAL_MARKERS = [
  "This link will take you to a page that\u2019s not on LinkedIn",
  "This link will take you to a page that’s not on LinkedIn",
  "Because this is an external link, we\u2019re unable to verify it for safety.",
  "Because this is an external link, we’re unable to verify it for safety."
];

function normalizeInputUrl(inputUrl) {
  if (typeof inputUrl !== "string" || inputUrl.trim() === "") {
    throw new Error("Enter a valid URL.");
  }

  const trimmed = inputUrl.trim();
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch (_error) {
    throw new Error("Enter a valid URL.");
  }
}

function readLocationHeader(headers) {
  if (!headers || typeof headers.get !== "function") {
    return null;
  }

  const value = headers.get("location");
  if (!value || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function isLinkedInHost(hostname) {
  const host = hostname.toLowerCase();
  return host === "lnkd.in" || host === "linkedin.com" || host.endsWith(".linkedin.com") || host.endsWith(".licdn.com");
}

function extractFirstExternalLinkFromLinkedInHtml(html, currentUrl) {
  const normalized = LINKEDIN_INTERSTITIAL_MARKERS.some((marker) => html.includes(marker));
  if (!normalized) {
    return null;
  }

  const matches = html.match(/https?:\/\/[^"'<>\s)]+/g) ?? [];
  for (const rawCandidate of matches) {
    const candidate = rawCandidate.replace(/&amp;/g, "&");
    try {
      const parsed = new URL(candidate, currentUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        continue;
      }
      if (parsed.toString() === currentUrl) {
        continue;
      }
      if (isLinkedInHost(parsed.hostname)) {
        continue;
      }
      return parsed.toString();
    } catch (_error) {
      continue;
    }
  }

  return null;
}

function extractLinkedInQueryParamTarget(parsedUrl) {
  for (const key of ["url", "redirectUrl", "targetUrl"]) {
    const candidate = parsedUrl.searchParams.get(key);
    if (!candidate) continue;
    try {
      const decoded = new URL(candidate);
      if (!["http:", "https:"].includes(decoded.protocol)) continue;
      if (decoded.toString() === parsedUrl.toString()) continue;
      return decoded.toString();
    } catch (_error) {
      continue;
    }
  }
  return null;
}

async function maybeExtractLinkedInInterstitialTarget(linkedInUrl, fetchImpl, timeoutMs) {
  let parsedUrl;
  try {
    parsedUrl = new URL(linkedInUrl);
  } catch (_error) {
    return null;
  }

  if (!isLinkedInHost(parsedUrl.hostname)) {
    return null;
  }

  const queryTarget = extractLinkedInQueryParamTarget(parsedUrl);
  if (queryTarget) {
    return queryTarget;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(linkedInUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal
    });

    if (!response || typeof response.text !== "function") {
      return null;
    }

    const html = await response.text();
    return extractFirstExternalLinkFromLinkedInHtml(html, linkedInUrl);
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function requestStep(url, method, fetchImpl, timeoutMs, redirectMode = "manual") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method,
      redirect: redirectMode,
      cache: "no-store",
      headers: method === "GET" ? { Range: "bytes=0-0" } : undefined,
      signal: controller.signal
    });

    return {
      method,
      status: response.status,
      type: response.type,
      responseUrl: response.url || url,
      location: readLocationHeader(response.headers)
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Request failed for ${url}: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveUrl(inputUrl, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxHops = Number.isInteger(options.maxHops) && options.maxHops > 0 ? options.maxHops : DEFAULT_MAX_HOPS;
  const timeoutMs =
    Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;

  if (typeof fetchImpl !== "function") {
    throw new Error("A valid fetch implementation is required.");
  }

  const normalizedInput = normalizeInputUrl(inputUrl);
  const visitedUrls = new Set([normalizedInput]);
  const chain = [];

  let currentUrl = normalizedInput;
  let hops = 0;

  while (hops <= maxHops) {
    let step = await requestStep(currentUrl, "HEAD", fetchImpl, timeoutMs);
    if (HEAD_FALLBACK_STATUS_CODES.has(step.status)) {
      step = await requestStep(currentUrl, "GET", fetchImpl, timeoutMs);
    }

    const isOpaqueRedirect = step.status === 0 && step.type === "opaqueredirect" && !step.location;
    if (isOpaqueRedirect) {
      step = await requestStep(currentUrl, "GET", fetchImpl, timeoutMs, "follow");
    }

    if (!REDIRECT_STATUS_CODES.has(step.status)) {
      const landedUrl = step.responseUrl || currentUrl;
      const interstitialTarget = await maybeExtractLinkedInInterstitialTarget(landedUrl, fetchImpl, timeoutMs);

      if (interstitialTarget && interstitialTarget !== landedUrl && !visitedUrls.has(interstitialTarget)) {
        chain.push({
          method: step.method,
          status: step.status,
          url: currentUrl,
          nextUrl: interstitialTarget
        });
        hops += 1;
        if (hops > maxHops) {
          throw new Error(`Exceeded maximum redirects (${maxHops})`);
        }
        visitedUrls.add(interstitialTarget);
        currentUrl = interstitialTarget;
        continue;
      }

      const finalUrl = landedUrl;
      chain.push({
        method: step.method,
        status: step.status,
        url: currentUrl,
        finalUrl: finalUrl !== currentUrl ? finalUrl : undefined
      });
      const inputHost = new URL(normalizedInput).hostname;
      const finalHost = new URL(finalUrl).hostname;
      return {
        inputUrl: normalizedInput,
        finalUrl,
        inputHost,
        finalHost,
        hostChanged: inputHost !== finalHost,
        hops,
        chain
      };
    }

    if (!step.location) {
      throw new Error(`Redirect response missing Location header at ${currentUrl}`);
    }

    const nextUrl = new URL(step.location, currentUrl).toString();
    chain.push({
      method: step.method,
      status: step.status,
      url: currentUrl,
      nextUrl
    });

    hops += 1;
    if (visitedUrls.has(nextUrl)) {
      throw new Error(`Redirect loop detected at ${nextUrl}`);
    }
    if (hops > maxHops) {
      throw new Error(`Exceeded maximum redirects (${maxHops})`);
    }

    visitedUrls.add(nextUrl);
    currentUrl = nextUrl;
  }

  throw new Error(`Exceeded maximum redirects (${maxHops})`);
}
