# Theme Toggle And History Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the popup theme dropdown with a single icon toggle and make the history panel open smoothly without popup shake.

**Architecture:** Reduce theme state to `light` and `dark`, expose a small toggle helper in the theme-preference module, and render the current mode with inline SVG icons inside a single button. Stop the history jitter by keeping the popup width stable and animating the panel with transforms/opacity instead of changing the popup’s measured width during the slide.

**Tech Stack:** Chrome Extension Manifest V3, vanilla HTML/CSS/JS, Node test runner

### Task 1: Theme preference toggle behavior

**Files:**
- Modify: `src/themePreference.js`
- Modify: `tests/themePreference.test.js`

**Step 1: Write the failing test**

```javascript
test("loadThemePreference falls back to light and toggleThemePreference flips light/dark", async () => {
  assert.equal(await loadThemePreference(makeStorage()), "light");
  assert.equal(toggleThemePreference("light"), "dark");
  assert.equal(toggleThemePreference("dark"), "light");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/themePreference.test.js`
Expected: FAIL because the current helper still supports `system` and does not expose `toggleThemePreference`

**Step 3: Write minimal implementation**

```javascript
const VALID_THEME_PREFERENCES = new Set(["light", "dark"]);
export function toggleThemePreference(value) {
  return value === "dark" ? "light" : "dark";
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/themePreference.test.js`
Expected: PASS

### Task 2: Popup icon toggle and stable history layout

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.css`
- Modify: `popup/popup.js`
- Modify: `README.md`

**Step 1: Replace the control markup**

```html
<button id="theme-toggle-button" ...>
  [sun svg]
  [moon svg]
</button>
```

**Step 2: Move history panel to an absolutely-positioned sliding layer**

```css
.app {
  width: 510px;
}
.history-panel {
  position: absolute;
  transform: translateX(12px);
}
```

**Step 3: Update popup logic**

```javascript
const nextTheme = await saveThemePreference(toggleThemePreference(themePreference));
applyThemePreference(nextTheme);
```

**Step 4: Verify manually**

Run: load unpacked extension and open/close History repeatedly
Expected: no resize shake during animation

### Task 3: Verification

**Files:**
- Test: `tests/themePreference.test.js`

**Step 1: Run targeted tests**

Run: `node --test tests/themePreference.test.js`
Expected: PASS

**Step 2: Run full suite**

Run: `npm test`
Expected: PASS

**Step 3: Syntax check popup**

Run: `node --check popup/popup.js`
Expected: PASS
