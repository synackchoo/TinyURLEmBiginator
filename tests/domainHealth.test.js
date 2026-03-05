import test from "node:test";
import assert from "node:assert/strict";

import { getDomainHealth, summarizeCrtShCertificates, summarizeRdapRecord } from "../src/domainHealth.js";

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    }
  };
}

test("summarizeCrtShCertificates computes first/last seen and common names", () => {
  const entries = [
    {
      common_name: "example.com",
      name_value: "example.com\nwww.example.com",
      entry_timestamp: "2024-01-02T10:00:00.000Z"
    },
    {
      common_name: "www.example.com",
      name_value: "www.example.com",
      entry_timestamp: "2025-02-02T10:00:00.000Z"
    },
    {
      common_name: "*.example.com",
      name_value: "*.example.com",
      entry_timestamp: "2023-12-31T23:00:00.000Z"
    }
  ];

  const summary = summarizeCrtShCertificates(entries);
  assert.equal(summary.certificateCount, 3);
  assert.equal(summary.firstSeen, "2023-12-31T23:00:00.000Z");
  assert.equal(summary.lastSeen, "2025-02-02T10:00:00.000Z");
  assert.deepEqual(summary.commonNames, ["*.example.com", "example.com", "www.example.com"]);
});

test("summarizeRdapRecord extracts registration and registrar details", () => {
  const rdapRecord = {
    events: [
      { action: "registration", eventDate: "2010-10-10T00:00:00Z" },
      { action: "last changed", eventDate: "2024-02-01T18:21:10Z" },
      { action: "expiration", eventDate: "2030-10-10T00:00:00Z" }
    ],
    status: ["client transfer prohibited"],
    entities: [
      {
        roles: ["registrar"],
        vcardArray: [
          "vcard",
          [
            ["fn", {}, "text", "MarkMonitor Inc."]
          ]
        ]
      }
    ]
  };

  const summary = summarizeRdapRecord(rdapRecord);
  assert.equal(summary.registrationDate, "2010-10-10T00:00:00.000Z");
  assert.equal(summary.lastChangedDate, "2024-02-01T18:21:10.000Z");
  assert.equal(summary.expirationDate, "2030-10-10T00:00:00.000Z");
  assert.deepEqual(summary.status, ["client transfer prohibited"]);
  assert.equal(summary.registrar, "MarkMonitor Inc.");
});

test("summarizeRdapRecord supports eventAction variant fields", () => {
  const rdapRecord = {
    events: [
      { eventAction: "registration", eventDate: "2011-05-21T13:00:00Z" },
      { eventAction: "expiration", eventDate: "2031-05-21T13:00:00Z" }
    ]
  };

  const summary = summarizeRdapRecord(rdapRecord);
  assert.equal(summary.registrationDate, "2011-05-21T13:00:00.000Z");
  assert.equal(summary.expirationDate, "2031-05-21T13:00:00.000Z");
});

test("getDomainHealth fetches crt.sh and rdap summaries", async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    if (url.startsWith("https://crt.sh/")) {
      return jsonResponse([
        {
          common_name: "example.com",
          name_value: "example.com",
          entry_timestamp: "2024-01-01T00:00:00Z"
        }
      ]);
    }
    if (url === "https://rdap.org/domain/example.com") {
      return jsonResponse({
        events: [{ action: "registration", eventDate: "2015-08-12T12:00:00Z" }],
        entities: [],
        status: []
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await getDomainHealth("example.com", { fetchImpl: fakeFetch });
  assert.equal(result.domain, "example.com");
  assert.equal(result.crtSh.certificateCount, 1);
  assert.equal(result.crtSh.firstSeen, "2024-01-01T00:00:00.000Z");
  assert.equal(result.rdap.registrationDate, "2015-08-12T12:00:00.000Z");
  assert.equal(result.rdap.registrar, null);
  assert.equal(calls.length, 2);
  assert.ok(calls[0].startsWith("https://crt.sh/?q=example.com"));
  assert.equal(calls[1], "https://rdap.org/domain/example.com");
});
