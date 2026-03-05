import test from "node:test";
import assert from "node:assert/strict";

import { resolveUrl } from "../src/resolver.js";

test("follows redirects until final URL", async () => {
  const responses = [
    { status: 301, location: "https://tiny.example/next" },
    { status: 302, location: "/end" },
    { status: 200 }
  ];

  const fakeFetch = async () => {
    const next = responses.shift();
    return {
      status: next.status,
      headers: {
        get(name) {
          if (name.toLowerCase() === "location") {
            return next.location ?? null;
          }
          return null;
        }
      }
    };
  };

  const result = await resolveUrl("https://bit.ly/demo", { fetchImpl: fakeFetch, maxHops: 10 });

  assert.equal(result.finalUrl, "https://tiny.example/end");
  assert.equal(result.inputHost, "bit.ly");
  assert.equal(result.finalHost, "tiny.example");
  assert.equal(result.hostChanged, true);
  assert.equal(result.hops, 2);
  assert.equal(result.chain.length, 3);
});

test("falls back to GET when HEAD is rejected", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push(`${options.method} ${url}`);
    if (url === "https://t.co/a" && options.method === "HEAD") {
      return {
        status: 405,
        headers: {
          get() {
            return null;
          }
        }
      };
    }

    if (url === "https://t.co/a" && options.method === "GET") {
      return {
        status: 302,
        headers: {
          get(name) {
            if (name.toLowerCase() === "location") {
              return "https://example.org/final";
            }
            return null;
          }
        }
      };
    }

    return {
      status: 200,
      headers: {
        get() {
          return null;
        }
      }
    };
  };

  const result = await resolveUrl("https://t.co/a", { fetchImpl: fakeFetch, maxHops: 10 });
  assert.deepEqual(calls, [
    "HEAD https://t.co/a",
    "GET https://t.co/a",
    "HEAD https://example.org/final"
  ]);
  assert.equal(result.finalUrl, "https://example.org/final");
  assert.equal(result.hostChanged, true);
});

test("throws on redirect loop", async () => {
  const fakeFetch = async (_url, _options) => {
    return {
      status: 302,
      headers: {
        get(name) {
          if (name.toLowerCase() === "location") {
            return "https://loop.example/start";
          }
          return null;
        }
      }
    };
  };

  await assert.rejects(
    () => resolveUrl("https://loop.example/start", { fetchImpl: fakeFetch, maxHops: 10 }),
    /Redirect loop/
  );
});

test("marks host unchanged when no redirects occur", async () => {
  const fakeFetch = async () => {
    return {
      status: 200,
      url: "https://safe.example/page",
      headers: {
        get() {
          return null;
        }
      }
    };
  };

  const result = await resolveUrl("https://safe.example/page", { fetchImpl: fakeFetch, maxHops: 10 });
  assert.equal(result.finalUrl, "https://safe.example/page");
  assert.equal(result.hostChanged, false);
  assert.equal(result.inputHost, "safe.example");
  assert.equal(result.finalHost, "safe.example");
});

test("uses response.url as final destination when non-redirect response URL differs", async () => {
  const fakeFetch = async () => {
    return {
      status: 200,
      url: "https://cwe.mitre.org/data/definitions/400.html",
      headers: {
        get() {
          return null;
        }
      }
    };
  };

  const result = await resolveUrl("https://lnkd.in/d3w8tCfg", { fetchImpl: fakeFetch, maxHops: 10 });

  assert.equal(result.finalUrl, "https://cwe.mitre.org/data/definitions/400.html");
  assert.equal(result.inputHost, "lnkd.in");
  assert.equal(result.finalHost, "cwe.mitre.org");
  assert.equal(result.hostChanged, true);
});

test("falls back to follow mode when manual response is opaque redirect", async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push(`${options.method}:${options.redirect}:${url}`);

    if (options.redirect === "manual") {
      return {
        status: 0,
        type: "opaqueredirect",
        url,
        headers: {
          get() {
            return null;
          }
        }
      };
    }

    return {
      status: 200,
      type: "cors",
      url: "https://hackerone.com/reports/1168804",
      headers: {
        get() {
          return null;
        }
      }
    };
  };

  const result = await resolveUrl("https://lnkd.in/d-Si6FJs", { fetchImpl: fakeFetch, maxHops: 10 });

  assert.equal(result.finalUrl, "https://hackerone.com/reports/1168804");
  assert.equal(result.hostChanged, true);
  assert.deepEqual(calls, [
    "HEAD:manual:https://lnkd.in/d-Si6FJs",
    "GET:follow:https://lnkd.in/d-Si6FJs"
  ]);
});

test("extracts external destination from LinkedIn interstitial HTML", async () => {
  const calls = [];
  const interstitialHtml = `
    <html>
      <body>
        <h1>This link will take you to a page that’s not on LinkedIn</h1>
        <p>Because this is an external link, we’re unable to verify it for safety.</p>
        <a href="https://www.linkedin.com/help/linkedin/answer/a1341680">Learn more</a>
        <a href="https://github.com/CyberSecurityUP/Red-Team-Exercises/blob/main/ipv4-shellcode.cpp">Continue</a>
      </body>
    </html>
  `;

  const fakeFetch = async (url, options) => {
    calls.push(`${options.method}:${options.redirect}:${url}`);

    if (options.method === "HEAD" && options.redirect === "manual") {
      return {
        status: 200,
        type: "basic",
        url: "https://lnkd.in/dJaEYkCt",
        headers: {
          get() {
            return null;
          }
        }
      };
    }

    if (options.method === "GET" && options.redirect === "follow") {
      return {
        status: 200,
        type: "basic",
        url: "https://lnkd.in/dJaEYkCt",
        headers: {
          get() {
            return "text/html";
          }
        },
        async text() {
          return interstitialHtml;
        }
      };
    }

    throw new Error(`Unexpected request: ${options.method} ${options.redirect} ${url}`);
  };

  const result = await resolveUrl("https://lnkd.in/dJaEYkCt", { fetchImpl: fakeFetch, maxHops: 10 });
  assert.equal(result.finalUrl, "https://github.com/CyberSecurityUP/Red-Team-Exercises/blob/main/ipv4-shellcode.cpp");
  assert.equal(result.inputHost, "lnkd.in");
  assert.equal(result.finalHost, "github.com");
  assert.equal(result.hostChanged, true);
  assert.deepEqual(calls, ["HEAD:manual:https://lnkd.in/dJaEYkCt", "GET:follow:https://lnkd.in/dJaEYkCt"]);
});
