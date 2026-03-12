# Domain Risk Summary Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `Low` / `Medium` / `High` risk summary to domain health results and surface it in the popup.

**Architecture:** Keep the existing `crt.sh` and RDAP fetch flow intact, then derive a small deterministic `risk` object from the summarized data. The popup will render the score inline in the existing domain-health summary area, so the response shape stays compact and backwards-compatible aside from one additive field.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JavaScript, Node test runner

### Task 1: Risk assessment tests

**Files:**
- Modify: `tests/domainHealth.test.js`
- Test: `tests/domainHealth.test.js`

**Step 1: Write the failing test**

```javascript
test("assessDomainRisk returns high for very new domains with weak certificate history", () => {
  const result = assessDomainRisk({...}, { now: "2026-03-11T00:00:00.000Z" });
  assert.equal(result.level, "High");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/domainHealth.test.js`
Expected: FAIL because `assessDomainRisk` does not exist yet

**Step 3: Write minimal implementation**

```javascript
if (domainAgeDays !== null && domainAgeDays < 30) score += 2;
if ((crtSh.certificateCount ?? 0) <= 1) score += 1;
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/domainHealth.test.js`
Expected: PASS

### Task 2: Attach risk object to domain health payload

**Files:**
- Modify: `src/domainHealth.js`
- Modify: `tests/domainHealth.test.js`

**Step 1: Extend `getDomainHealth` result**

```javascript
return {
  domain,
  crtSh,
  rdap,
  risk: assessDomainRisk({ domain, crtSh, rdap, checkedAt }),
  checkedAt
};
```

**Step 2: Run tests**

Run: `node --test tests/domainHealth.test.js`
Expected: PASS

### Task 3: Surface risk in popup summary

**Files:**
- Modify: `popup/popup.js`

**Step 1: Update summary line**

```javascript
const riskText = healthResult.risk ? `Risk: ${healthResult.risk.level}` : "Risk: Unknown";
```

**Step 2: Run syntax and full tests**

Run: `node --check popup/popup.js`
Expected: PASS

Run: `npm test`
Expected: PASS
