# Dark Mode And Icon Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a user-selectable dark mode option to the popup, refresh the extension icon artwork, and leave the codebase positioned for better domain assessment messaging.

**Architecture:** Keep theme state in `chrome.storage.local` behind a small popup-focused storage helper so the popup can initialize and persist theme preference cleanly. Apply theme changes through CSS custom properties and a root `data-theme` attribute. Refresh the icon PNG assets from a small local generator script so the artwork is reproducible instead of being hand-edited binaries.

**Tech Stack:** Chrome Extension Manifest V3, vanilla HTML/CSS/JS, Node test runner, Python standard library for icon generation

### Task 1: Theme preference storage helper

**Files:**
- Create: `src/themePreference.js`
- Test: `tests/themePreference.test.js`

**Step 1: Write the failing test**

```javascript
test("loadThemePreference returns saved mode and falls back to system", async () => {
  const storage = makeStorage({ popupThemePreference: "dark" });
  assert.equal(await loadThemePreference(storage), "dark");
  assert.equal(await loadThemePreference(makeStorage()), "system");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/themePreference.test.js`
Expected: FAIL because `src/themePreference.js` does not exist yet

**Step 3: Write minimal implementation**

```javascript
export async function loadThemePreference(storageArea = chrome.storage.local) {
  const data = await storageArea.get(THEME_PREFERENCE_STORAGE_KEY);
  return normalizeThemePreference(data?.[THEME_PREFERENCE_STORAGE_KEY]);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/themePreference.test.js`
Expected: PASS

### Task 2: Popup theme UI and persistence

**Files:**
- Modify: `popup/popup.html`
- Modify: `popup/popup.css`
- Modify: `popup/popup.js`
- Modify: `README.md`
- Test: `tests/themePreference.test.js`

**Step 1: Write the failing test**

```javascript
test("saveThemePreference persists normalized values", async () => {
  const storage = makeStorage();
  const saved = await saveThemePreference("dark", storage);
  assert.equal(saved, "dark");
  assert.deepEqual(storage.dump(), { popupThemePreference: "dark" });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/themePreference.test.js`
Expected: FAIL because `saveThemePreference` is not implemented yet

**Step 3: Write minimal implementation**

```javascript
const themePreference = await loadThemePreference();
applyThemePreference(themePreference);
themeSelect.addEventListener("change", async () => {
  const savedPreference = await saveThemePreference(themeSelect.value);
  applyThemePreference(savedPreference);
});
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/themePreference.test.js`
Expected: PASS

### Task 3: Reproducible icon refresh

**Files:**
- Create: `scripts/generate_icons.py`
- Modify: `icons/icon16.png`
- Modify: `icons/icon48.png`
- Modify: `icons/icon128.png`

**Step 1: Write the generator first**

```python
draw_lens(...)
draw_url_lines(...)
save_resized_icons(...)
```

**Step 2: Run the generator**

Run: `python3 scripts/generate_icons.py`
Expected: icon files updated successfully

**Step 3: Verify output**

Run: `file icons/icon16.png icons/icon48.png icons/icon128.png`
Expected: PNG image data at 16, 48, and 128 pixels

### Task 4: Verification

**Files:**
- Test: `tests/themePreference.test.js`
- Test: `tests/historyStore.test.js`
- Test: `tests/domainHealth.test.js`
- Test: `tests/resolver.test.js`

**Step 1: Run targeted tests**

Run: `node --test tests/themePreference.test.js`
Expected: PASS

**Step 2: Run full suite**

Run: `npm test`
Expected: PASS

**Step 3: Review diff**

Run: `git diff -- popup/popup.html popup/popup.css popup/popup.js src/themePreference.js tests/themePreference.test.js README.md`
Expected: Theme toggle, CSS variables, storage helper, docs, and no unrelated code movement
