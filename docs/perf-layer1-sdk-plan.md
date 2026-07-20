# Layer 1 — SDK packaging (tree-shakeable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@atomiqlabs/sdk`, `@atomiqlabs/base`, `@atomiqlabs/btc-mempool`, and `@atomiqlabs/messenger-nostr` tree-shakeable by adding an ESM build to `dist-esm` (leaving the CommonJS `dist` untouched) plus `sideEffects:false` and an `exports` map — so the webapp's light imports stop dragging the ~539 KB SDK core, while the CJS server consumers keep working unchanged.

**Architecture:** Each package keeps its current CJS `tsc` build emitting to `dist`, and gains a second `tsc` pass (`tsconfig.esm.json`, `module: es2022`) emitting to `dist-esm`, marked as ESM via a `dist-esm/package.json` `{"type":"module"}`. `package.json` gains `module`, `sideEffects:false`, and an `exports` map with `import`→`dist-esm`, `require`→`dist`, and a `./dist/*` passthrough. No source code changes; the SDK barrel's re-exports of `MempoolApi`/`NostrMessenger` tree-shake automatically once those packages are `sideEffects:false` ESM.

**Tech Stack:** TypeScript 4.9 (pinned build compiler), Node, npm.

## Global Constraints

- `dist` stays CommonJS with the **same layout and content**; only add `dist-esm`. Never relocate `dist` to `dist/cjs`.
- The four CJS consumers (`atomiq-lp`, `atomiq-relay`, `server-base`, `atomiq-swaps-be`) must still build and run unchanged (they resolve the `require`/`main` condition → `dist`).
- Set `"sideEffects": false` **only after** auditing the package for import-time side effects; if any module runs code at import (global/`window` assignment, top-level `new`, prototype patching), allowlist it: `"sideEffects": ["./dist-esm/thatModule.js"]`.
- `module: es2022` for the ESM build; keep `moduleResolution: node`.
- Publish order: **`base` → `sdk`** (sdk depends on base); `btc-mempool` and `messenger-nostr` are independent.
- Commit format `<area>: <imperative what>`; never add an AI co-author/attribution trailer.
- Work each package on a branch `perf/esm-treeshake` off `develop`; do not commit on `develop`.

---

### Task 1: `@atomiqlabs/base` — dual CJS/ESM packaging

**Files** (repo `/Users/marci/dev/Atomiq/atomiq-base`):
- Create: `tsconfig.esm.json`
- Modify: `package.json` (scripts.build, module, sideEffects, exports, files)

**Interfaces:**
- Produces: `@atomiqlabs/base` resolving to ESM (`dist-esm/index.js`) for bundlers and CJS (`dist/index.js`) for `require`. Consumed by Task 2 (sdk depends on base) and Task 4 (verification).

- [ ] **Step 1: Branch**

```bash
cd /Users/marci/dev/Atomiq/atomiq-base && git checkout -b perf/esm-treeshake
```

- [ ] **Step 2: Audit for import-time side effects**

Run: `grep -rnE "^(window|globalThis|global)\.|^[^/*]*\bnew [A-Z]|\.prototype\.|^\(function" dist --include=*.js | grep -v "\.d\.ts" | head -40`
Expected: no top-level global assignments / top-level `new` / prototype patching. If matches appear, note the file(s) — they go in the `sideEffects` allowlist instead of blanket `false`.

- [ ] **Step 3: Create `tsconfig.esm.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "es2022",
    "moduleResolution": "node",
    "outDir": "./dist-esm",
    "declaration": false
  }
}
```

- [ ] **Step 4: Update `package.json`**

Set the build script to emit both formats and the ESM type marker, and add the resolution fields. Replace the `"build"` script and add the four keys (keep every other existing field):

```jsonc
"main": "./dist/index.js",
"module": "./dist-esm/index.js",
"sideEffects": false,
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist-esm/index.js", "require": "./dist/index.js" },
  "./package.json": "./package.json",
  "./dist/*": "./dist/*"
},
"files": ["/dist", "/dist-esm", "/src"],
"scripts": {
  "build": "npx -y -p typescript@4.9 tsc && npx -y -p typescript@4.9 tsc -p tsconfig.esm.json && node -e \"require('fs').writeFileSync('dist-esm/package.json', JSON.stringify({type:'module'}))\""
}
```

(If Step 2 found side-effect modules, use `"sideEffects": ["./dist-esm/<file>.js"]` instead of `false`.)

- [ ] **Step 5: Build both outputs**

Run: `cd /Users/marci/dev/Atomiq/atomiq-base && npm run build`
Expected: completes with no errors; `dist-esm/index.js` and `dist-esm/package.json` now exist.

- [ ] **Step 6: Verify `dist` (CJS) is unchanged and both entrypoints import**

Run: `git diff --stat dist/ | tail -1` — Expected: no substantive changes to `dist` (only re-emitted identical files; if git shows diffs, confirm they're byte-identical re-emits, not content changes).
Run (CJS): `node -e "const m=require('./dist/index.js'); console.log('cjs keys:', Object.keys(m).length)"` — Expected: a positive count, no error.
Run (ESM): `node --input-type=module -e "import * as m from './dist-esm/index.js'; console.log('esm keys:', Object.keys(m).length)"` — Expected: same positive count, no error.

- [ ] **Step 7: Commit**

```bash
cd /Users/marci/dev/Atomiq/atomiq-base
git add package.json tsconfig.esm.json
git commit -m "build: emit ESM to dist-esm and mark sideEffects-free for tree-shaking"
```

---

### Task 2: `@atomiqlabs/sdk` — dual CJS/ESM packaging

**Files** (repo `/Users/marci/dev/Atomiq/atomiq-sdk`):
- Create: `tsconfig.esm.json`
- Modify: `package.json` (scripts.build, module, sideEffects, exports, files)

**Interfaces:**
- Consumes: nothing from Task 1 at build time (independent packaging), but full tree-shaking of the SDK barrel's `MempoolApi`/`NostrMessenger` re-exports requires Tasks 3 done too.
- Produces: `@atomiqlabs/sdk` resolving ESM for bundlers / CJS for `require`; the webapp's light imports (`isSCToken`, `SwapType`, …) now tree-shakeable.

- [ ] **Step 1: Branch**

```bash
cd /Users/marci/dev/Atomiq/atomiq-sdk && git checkout -b perf/esm-treeshake
```

- [ ] **Step 2: Audit for import-time side effects**

Run: `grep -rnE "^(window|globalThis|global)\.|^[^/*]*\bnew [A-Z]|\.prototype\.|^\(function" dist --include=*.js | grep -v "\.d\.ts" | head -40`
Expected: none critical. The spike already confirmed the SDK compiles cleanly to ESM with zero interop errors; this step catches any module that must be allowlisted.

- [ ] **Step 3: Create `tsconfig.esm.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "es2022",
    "moduleResolution": "node",
    "outDir": "./dist-esm",
    "declaration": false
  }
}
```

- [ ] **Step 4: Update `package.json`**

Add/replace (keep every other existing field; note `files` keeps `/api`):

```jsonc
"main": "./dist/index.js",
"module": "./dist-esm/index.js",
"sideEffects": false,
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist-esm/index.js", "require": "./dist/index.js" },
  "./package.json": "./package.json",
  "./dist/*": "./dist/*"
},
"files": ["/dist", "/dist-esm", "/src", "/api"],
"scripts": {
  "build": "npx -y -p typescript@4.9 tsc && npx -y -p typescript@4.9 tsc -p tsconfig.esm.json && node -e \"require('fs').writeFileSync('dist-esm/package.json', JSON.stringify({type:'module'}))\""
}
```

- [ ] **Step 5: Build both outputs**

Run: `cd /Users/marci/dev/Atomiq/atomiq-sdk && npm run build`
Expected: no errors; `dist-esm/index.js` + `dist-esm/package.json` exist.

- [ ] **Step 6: Verify `dist` unchanged + both entrypoints import**

Run: `git diff --stat dist/ | tail -1` — Expected: no substantive content change.
Run (CJS): `node -e "const m=require('./dist/index.js'); console.log('isSCToken:', typeof m.isSCToken, 'SwapType:', typeof m.SwapType)"` — Expected: `function` and `object` (enum), no error.
Run (ESM): `node --input-type=module -e "import { isSCToken, SwapType } from './dist-esm/index.js'; console.log(typeof isSCToken, typeof SwapType)"` — Expected: `function object`, no error.

- [ ] **Step 7: Commit**

```bash
cd /Users/marci/dev/Atomiq/atomiq-sdk
git add package.json tsconfig.esm.json
git commit -m "build: emit ESM to dist-esm and mark sideEffects-free for tree-shaking"
```

---

### Task 3: `@atomiqlabs/btc-mempool` + `@atomiqlabs/messenger-nostr` — same recipe (PREREQUISITE: repos not in container)

**Status:** These two packages are **not checked out in this container** (only present in `node_modules`). They must be cloned from the atomiqlabs org first. Apply the identical recipe from Tasks 1–2 to each.

**Files** (per repo, once cloned): create `tsconfig.esm.json`; modify `package.json`.

- [ ] **Step 1: Clone the repos**

Locate and clone both from the atomiqlabs GitHub org (Adam has the exact repo names; installed versions are `@atomiqlabs/btc-mempool@1.1.2` and `@atomiqlabs/messenger-nostr@2.0.1`). Confirm each builds today with its existing `npm run build`.

- [ ] **Step 2: Audit each for import-time side effects**

Run in each repo: `grep -rnE "^(window|globalThis|global)\.|^[^/*]*\bnew [A-Z]|\.prototype\.|^\(function" dist --include=*.js | grep -v "\.d\.ts" | head -40`
Expected: **`messenger-nostr` is the prime suspect** (Nostr client setup may run at import). If it initializes anything at module scope, use `"sideEffects": ["./dist-esm/<thatFile>.js"]` rather than blanket `false`.

- [ ] **Step 3: Add `tsconfig.esm.json` to each** (identical to Task 1 Step 3):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "es2022",
    "moduleResolution": "node",
    "outDir": "./dist-esm",
    "declaration": false
  }
}
```

- [ ] **Step 4: Update each `package.json`** — add `module`, `sideEffects` (or allowlist), `exports`, add `/dist-esm` to `files`, and the dual `build` script (identical shape to Task 1 Step 4, adjusting the existing `files` array per repo). Use the package's real `main`/`files` values; do not assume `/src` etc. — read each repo's current `package.json` first.

- [ ] **Step 5: Build + verify each** (same as Task 1 Steps 5–6: `npm run build`; CJS `require` smoke; ESM `import` smoke; `dist` unchanged).

- [ ] **Step 6: Commit each** on its own `perf/esm-treeshake` branch: `git commit -m "build: emit ESM to dist-esm and mark sideEffects-free for tree-shaking"`.

---

### Task 4: Verify — CJS consumers unbroken + webapp tree-shakes

**Files:** none (verification). Uses locally-built packages via temporary `node_modules` patching (gitignored, restorable), the same technique the spike used.

**Interfaces:**
- Consumes: the ESM builds from Tasks 1–3.
- Produces: evidence that (a) the four CJS consumers still build, (b) the webapp's light-import SDK footprint collapses.

- [ ] **Step 1: Confirm CJS consumers still resolve/build**

For each of `atomiq-lp`, `atomiq-relay`, `server-base`, `atomiq-swaps-be`: run its typecheck/build (`npm run build` or `tsc --noEmit` per repo). Expected: passes — they resolve the `require`/`main` condition to the unchanged `dist`. (Deep-import grep already confirmed zero `/dist/` deep imports, so `exports` locks nothing out.)

- [ ] **Step 2: Patch the webapp to use the ESM builds**

Back up then overwrite the webapp's installed copies with the freshly built packages (dist + dist-esm + patched package.json) for `@atomiqlabs/{sdk,base,btc-mempool,messenger-nostr}`:

```bash
cd /Users/marci/dev/Atomiq/atomiq-webapp
for p in sdk base; do cp -r node_modules/@atomiqlabs/$p /tmp/bak-$p; rm -rf node_modules/@atomiqlabs/$p; cp -r ../atomiq-$p node_modules/@atomiqlabs/$p; done
# (btc-mempool / messenger-nostr: copy from their cloned repos once Task 3 is done)
```

- [ ] **Step 3: Re-measure the light-import bundle**

Reuse the spike harness (`.superpowers/sdd/spike-sdk-treeshake.md` documents it): esbuild-bundle the light token-helper entry against the patched `node_modules`. 
Expected: the SDK's own footprint collapses from ~539 KB to single-digit KB (matching the spike), and with Task 3's packages the residual `btc-mempool`/`messenger-nostr` (~254 KB) also drops — total light-import bundle to tens of KB gz.

- [ ] **Step 4: Smoke the webapp**

Run `npm start`, load the app, confirm it renders and a swap flow works (no runtime error from the ESM SDK). Expected: functional parity.

- [ ] **Step 5: Restore the webapp's node_modules**

```bash
cd /Users/marci/dev/Atomiq/atomiq-webapp
for p in sdk base; do rm -rf node_modules/@atomiqlabs/$p; cp -r /tmp/bak-$p node_modules/@atomiqlabs/$p; done
```
Expected: `node -e "console.log(require('./node_modules/@atomiqlabs/sdk/package.json').sideEffects)"` prints `undefined` (restored). No repo changes (node_modules is gitignored).

---

### Task 5: Publish + bump consumers

**Files:** version bumps in the four package repos + dependency bumps in `atomiq-webapp` (and any server consumer if the range requires).

- [ ] **Step 1: Merge each `perf/esm-treeshake` branch** into its package's default branch (via PR per the team's process).

- [ ] **Step 2: Version bump + publish, in order**

`@atomiqlabs/base` first (patch bump, `npm publish`), then `@atomiqlabs/sdk`, then `@atomiqlabs/btc-mempool` and `@atomiqlabs/messenger-nostr` (independent). If `sdk` should pin the new `base`, bump its dependency before publishing sdk.

- [ ] **Step 3: Bump the webapp**

In `atomiq-webapp`, update the `@atomiqlabs/*` versions, `npm install`, and confirm `npm run build` succeeds and the production bundle's initial chunk shrinks vs the W0 baseline (`docs/perf-tier1-baseline.md`). Commit the lockfile + package.json bump.

- [ ] **Step 4: Confirm CJS consumers on the new versions**

Bump `@atomiqlabs/*` in `atomiq-lp`/`atomiq-relay`/`server-base`/`atomiq-swaps-be` as needed, install, build. Expected: unchanged behavior (they still get `dist`).

---

## Self-review notes

- **Coverage vs design Layer 1:** dist-esm build ✅ (Tasks 1–3), `sideEffects` audit ✅ (Step 2 of each), `exports` + back-compat ✅ (Task 1/2 Step 4 + Task 4 Step 1), all four packages ✅ (Tasks 1–3), CJS-consumer safety ✅ (Task 4 Step 1), webapp payoff measurement ✅ (Task 4 Step 3), publish/bump ✅ (Task 5).
- **Known non-file-accurate part:** Task 3 (btc-mempool, messenger-nostr) is a recipe pending repo clone — flagged, not a hidden gap.
- **`dist` untouched constraint** enforced by Task 1/2 Step 6 (git diff check).
