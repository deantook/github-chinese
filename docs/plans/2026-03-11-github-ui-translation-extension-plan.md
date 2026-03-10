# GitHub UI Translation Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a runnable Chrome (MV3) extension that translates GitHub UI to Chinese using an internal dictionary and a mixed strategy (selector-based + text replacement) with a simple global enable/disable toggle.

**Architecture:** The extension consists of a Manifest V3 entry, a background service worker for state and messaging, a content script that runs translation on GitHub pages with a MutationObserver, a translation engine + dictionaries module, a shared storage/message helper, and a simple popup UI. TypeScript sources are bundled via esbuild into multiple entry points, and static files (manifest, popup HTML) are copied into a `dist` directory.

**Tech Stack:** TypeScript, esbuild (CLI), Chrome Extensions Manifest V3, DOM APIs, Chrome Storage & Runtime APIs.

---

### Task 1: Initialize project tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

**Step 1:** Initialize `package.json` with basic metadata and scripts.  
- Scripts should include at least:
  - `"build"`: run esbuild to bundle TS entry points and then copy static files to `dist`.
  - `"clean"`: remove the `dist` directory.

**Step 2:** Add devDependencies for TypeScript and esbuild.  
- `typescript`  
- `esbuild`

**Step 3:** Create `tsconfig.json` configured for a browser/DOM environment targeting modern Chrome.  
- Enable strict type checking.  
- Set module to `esnext` or `es2020`, and moduleResolution to `node`.  
- Include `src/**/*.ts`.

**Step 4:** (Optional but recommended) Add simple `README.md` describing how to build and load the extension in Chrome.

---

### Task 2: Add manifest and static structure

**Files:**
- Create: `manifest.json`
- Create: `src/popup/index.html`

**Step 1:** Create `manifest.json` with Manifest V3 fields:  
- `name`, `version`, `description`, `manifest_version: 3`.  
- `action` pointing to `popup/index.html`.  
- `background.service_worker` pointing to `background.js` (bundled from TS).  
- `content_scripts` targeting `https://github.com/*` and loading `content.js`.  
- `permissions`: at least `storage`.  
- `host_permissions`: `https://github.com/*`.

**Step 2:** Create a minimal `src/popup/index.html` skeleton.  
- Contains a root element for the popup UI and a script tag that will load `popup.js` from the bundled output.

**Step 3:** Ensure the build process will copy `manifest.json` and `src/popup/index.html` into `dist` preserving relative paths.  
- This can be done via simple `cp` commands in the `build` script or a small Node copy script (keep it minimal).

---

### Task 3: Configure esbuild bundling

**Files:**
- Create: `scripts/build.mjs` (or `scripts/build.js`)

**Step 1:** Implement a Node build script that calls esbuild programmatically to create multiple entry points:  
- Entry: `src/content/index.ts` → `dist/content.js`  
- Entry: `src/background/index.ts` → `dist/background.js`  
- Entry: `src/popup/index.ts` → `dist/popup.js`

**Step 2:** Configure esbuild options:  
- `bundle: true`, `sourcemap: false` (or `true` for dev), `minify: false` for readability.  
- `target` set to a modern Chrome version.  
- `platform: 'browser'`.  
- Output format `iife` or `esm` depending on ease of use (for MV3, plain script is fine).

**Step 3:** Wire `npm run build` to invoke this build script and then copy static files into `dist`.

---

### Task 4: Implement shared storage and messaging helpers

**Files:**
- Create: `src/shared/storage.ts`
- Create: `src/shared/messages.ts`
- (Optional) Create: `src/shared/types.ts`

**Step 1:** In `storage.ts`, implement:  
- `getEnabled(): Promise<boolean>`: reads from `chrome.storage.sync` with a default of `true`.  
- `setEnabled(enabled: boolean): Promise<void>`: writes to `chrome.storage.sync`.

**Step 2:** In `messages.ts`, define message type constants and TypeScript types, e.g.:  
- `SYNC_STATE` message carrying `{ enabled: boolean }`.  
- Optionally `REQUEST_STATE` if content needs to query background.

**Step 3:** Export small helper functions to send sync messages, e.g. `broadcastEnabledState(enabled: boolean)` that uses `chrome.runtime.sendMessage`.

---

### Task 5: Implement background service worker

**Files:**
- Create: `src/background/index.ts`

**Step 1:** In the background script, listen to `chrome.runtime.onMessage` events.  
- Handle messages from popup to update the `enabled` flag via `setEnabled`.  
- Optionally respond with the current `enabled` state when requested.

**Step 2:** Ensure the background script initializes by reading the current `enabled` state on startup (mainly to keep a consistent view, even if it doesn’t push it anywhere yet).

**Step 3:** If useful, implement an internal helper to send a `SYNC_STATE` message to all tabs with `github.com` loaded, broadcasting the latest `enabled` state (may also be triggered from popup directly instead).

---

### Task 6: Implement popup UI logic

**Files:**
- Create: `src/popup/index.ts`
- Modify: `src/popup/index.html` (add markup for toggle)

**Step 1:** In `index.html`, add:  
- A container, a label, and an `<input type="checkbox">` representing the enable/disable toggle.  
- A small text for version or description if desired.

**Step 2:** In `popup/index.ts`, on DOMContentLoaded:  
- Read `enabled` state via `getEnabled()` and set the checkbox state accordingly.

**Step 3:** Attach a change listener to the checkbox:  
- On change, call `setEnabled(newValue)`.  
- Send a `SYNC_STATE` message (either via background or directly to the active tab) so content scripts can update immediately.

---

### Task 7: Implement dictionaries

**Files:**
- Create: `src/dictionaries/nav.ts`
- Create: `src/dictionaries/issue_pr.ts`
- Create: `src/dictionaries/common.ts`
- Create: `src/dictionaries/index.ts`

**Step 1:** Define simple maps in each file, e.g. `Record<string, string>` keyed by exact English phrases used in GitHub UI.  
- `nav.ts`: navigation labels like "Pull requests", "Issues", "Actions", "Projects".  
- `issue_pr.ts`: "Open", "Closed", "Merged", "Draft", typical buttons and statuses.  
- `common.ts`: "Loading…", "Updated", "View all", etc.

**Step 2:** In `index.ts`, export:  
- `getExactMap()` that merges all maps into a single `Record<string, string>`.  
- (Optional) `getPatternRules()` for future pattern-based replacements (can return an empty list in the first runnable version).

**Step 3:** Ensure translation style follows the agreed rules (keep PR/CI, otherwise natural Chinese).

---

### Task 8: Implement translation engine

**Files:**
- Create: `src/translation/types.ts`
- Create: `src/translation/selectors.ts`
- Create: `src/translation/text-replacer.ts`
- Create: `src/translation/engine.ts`

**Step 1:** In `types.ts`, define:  
- `TranslationContext` (may include information like DOM node type, location hints).  
- Rule types for selector-based translations (e.g. `{ selector, key? , apply(node) }`).

**Step 2:** In `selectors.ts`, create an initial list of selector-based rules targeting stable GitHub UI elements:  
- Top nav items, repo header tabs, sidebar sections.  
- For each rule, either:
  - Map directly to a Chinese string, or  
  - Use a key into the dictionary.

**Step 3:** In `text-replacer.ts`, implement traversal over a DOM subtree:  
- Walk text nodes under a given root, skipping sensitive containers (`pre`, `code`, inputs, textareas, `.markdown-body`, etc.).  
- For each text value, run it through a replacement function that uses the `exactMap` from dictionaries.  
- Replace text only when a known mapping is found, to avoid over-aggressive modifications.

**Step 4:** In `engine.ts`, implement:  
- `translateNodeTree(root: Node)` that:
  - First applies selector-based rules to known UI elements under `root`.  
  - Then runs `text-replacer` over the same subtree.  
- Optionally provide `translateText` for future finer-grained use.

---

### Task 9: Implement content script entry

**Files:**
- Create: `src/content/dom-watcher.ts`
- Create: `src/content/translate-runner.ts`
- Create: `src/content/index.ts`

**Step 1:** In `translate-runner.ts`, implement a helper:  
- `runTranslationOn(root: Node)` that just calls `translateNodeTree(root)`.  
- This isolates future context handling from the rest of the script.

**Step 2:** In `dom-watcher.ts`, implement a thin wrapper around `MutationObserver`:  
- Accept a callback `(node: Node) => void`.  
- Observe `document.body` for `childList` and `subtree` changes.  
- For each `addedNode` that is an `Element` or has child nodes, call the callback.

**Step 3:** In `content/index.ts` on startup:  
- Call `getEnabled()` to determine whether to act.  
- If enabled:
  - Call `runTranslationOn(document.body)`.  
  - Start `dom-watcher` with `runTranslationOn` as the callback.  
- Register a `chrome.runtime.onMessage` listener:  
  - On `SYNC_STATE` with `enabled: true`, ensure translation runs once on `document.body` and that the watcher is active.  
  - On `SYNC_STATE` with `enabled: false`, stop or ignore further DOM change processing.

---

### Task 10: Manual testing and packaging

**Files:**
- No new files required.

**Step 1:** Run `npm run build` to produce the `dist` directory with bundled scripts and static assets.

**Step 2:** In Chrome, open `chrome://extensions`, enable Developer mode, and load the `dist` directory as an unpacked extension.

**Step 3:** Navigate to various GitHub pages (homepage, repo page, issues, PRs) and verify:  
- Popup appears and the toggle controls translation.  
- With toggle ON, core UI elements (top nav, repo tabs, some labels) show Chinese text.  
- User content (issue titles, code, markdown) remains untouched.

**Step 4:** Note any DOM areas not yet translated but safe to handle; log them for future dictionary and selector updates.

