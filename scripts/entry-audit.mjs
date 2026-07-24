#!/usr/bin/env node
// Entry-chunk audit gate (workstream W5).
//
// Rebuild with `npm run analyze` first — that emits `stats.json` at the repo
// root (rollup-plugin-visualizer, raw-data template) and the bundle in
// `build/`. This script reads that stats.json, resolves the entry chunk that
// build/index.html actually loads, and asserts the entry contains NO modules
// from the heavy chain/crypto packages that the W5 burn-down evicted. Any
// surviving banned module fails the gate (exit 1) with its nearest in-entry
// importer chain printed, UNLESS it is on the documented allowlist below — in
// which case it is reported as a known residual WITH its reason, and the gate
// stays green.
//
// Usage: node scripts/entry-audit.mjs

import { readFileSync as rf } from 'node:fs';
import { gzipSync as gz } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const statsPath = join(repoRoot, 'stats.json');
const indexHtmlPath = join(repoRoot, 'build', 'index.html');

// --- Banned packages: must be ZERO in the entry chunk after W5. ---------------
// Each matcher tests a module id (a path like `/node_modules/<pkg>/...`).
const BANNED = [
  { label: 'starknet',           test: (id) => /(^|\/)node_modules\/starknet\//.test(id) },
  { label: 'ethers',             test: (id) => /(^|\/)node_modules\/ethers\//.test(id) },
  { label: '@solana/web3.js',    test: (id) => /(^|\/)node_modules\/@solana\/web3\.js\//.test(id) },
  { label: '@solana/spl-token',  test: (id) => /(^|\/)node_modules\/@solana\/spl-token\//.test(id) },
  { label: '@coral-xyz/anchor',  test: (id) => /(^|\/)node_modules\/@coral-xyz\/anchor\//.test(id) },
  { label: '@atomiqlabs/chain-*', test: (id) => /(^|\/)node_modules\/@atomiqlabs\/chain-/.test(id) },
  { label: '@scure/btc-signer',  test: (id) => /(^|\/)node_modules\/@scure\/btc-signer\//.test(id) },
];

// --- Allowlist: documented, reviewed residuals that must NOT fail the gate. ---
// Keep each entry honest: match narrowly and state exactly WHY it survives.
const ALLOWLIST = [
  {
    test: (id) => /(^|\/)node_modules\/@scure\/btc-signer\//.test(id),
    reason:
      'Known reviewed W5 residual: the SDK co-locates FromBTCSwapState / ' +
      'SpvFromBTCSwapState enums and the isFromBTCSwap / isSpvFromBTCSwap guards ' +
      'in the same modules (FromBTCSwap.js, SpvFromBTCSwap.js) that statically ' +
      'import @scure/btc-signer, and four eager hooks (useFromBtcQuote, ' +
      'useSpvVaultFromBtcQuote, useSwapState, useSwapFees) use those as runtime ' +
      'values. Evicting it requires a swap-panel lazy split or an upstream SDK ' +
      'module split, both out of W5 scope. Tracked as documented residual.',
  },
];

// -----------------------------------------------------------------------------
function fail(msg) {
  console.error(msg);
  process.exit(2);
}

let stats;
try {
  stats = JSON.parse(rf(statsPath, 'utf8'));
} catch (e) {
  fail(`Cannot read ${statsPath} — run \`npm run analyze\` first.\n  ${e.message}`);
}

// Resolve the entry chunk name from the module <script> in build/index.html.
let entryName;
try {
  const html = rf(indexHtmlPath, 'utf8');
  const m = html.match(/<script[^>]*type="module"[^>]*src="\/?([^"]+)"/);
  if (!m) fail(`Could not find the module <script> src in ${indexHtmlPath}.`);
  entryName = m[1]; // e.g. assets/index-XXXX.js
} catch (e) {
  fail(`Cannot read ${indexHtmlPath} — run \`npm run build\` / \`npm run analyze\` first.\n  ${e.message}`);
}

const { tree, nodeParts, nodeMetas } = stats;
const entryTree = tree.children.find((c) => c.name === entryName);
if (!entryTree) fail(`Entry chunk "${entryName}" not present in stats.json tree.`);

// Collect the metaUids (and their module ids) that live in the entry chunk.
const entryMetaUids = new Set();
(function walk(n) {
  if (n.uid) {
    const part = nodeParts[n.uid];
    if (part) entryMetaUids.add(part.metaUid);
    return;
  }
  if (n.children) n.children.forEach(walk);
})(entryTree);

const entryIds = [];
for (const mu of entryMetaUids) {
  const meta = nodeMetas[mu];
  if (meta) entryIds.push({ metaUid: mu, id: meta.id });
}

function short(id) {
  return id.replace(/.*node_modules\//, '').replace(/\?.*$/, '');
}

// Nearest in-entry importer chain: walk `importedBy` upward, staying inside the
// entry chunk, until we reach an app `/src/` module (or run out). Returns the
// first chain found (shortened ids, importer-last).
function nearestChain(startMetaUid) {
  const seen = new Set();
  const q = [[startMetaUid, [nodeMetas[startMetaUid]?.id]]];
  let fallback = null;
  while (q.length) {
    const [uid, path] = q.shift();
    if (seen.has(uid)) continue;
    seen.add(uid);
    const meta = nodeMetas[uid];
    if (!meta) continue;
    const importers = (meta.importedBy || []).filter((ib) => entryMetaUids.has(ib.uid));
    if (importers.length === 0) fallback = fallback || path;
    for (const ib of importers) {
      const im = nodeMetas[ib.uid];
      const next = [im?.id, ...path];
      if (/\/src\//.test(im?.id || '')) return dedupe(next);
      q.push([ib.uid, next]);
    }
  }
  return dedupe(fallback || [nodeMetas[startMetaUid]?.id]);
}

// Collapse consecutive parts that render to the same short id (commonjs-export
// proxy parts and the real module share a display path).
function dedupe(chain) {
  return chain.filter((id, i) => i === 0 || short(id) !== short(chain[i - 1]));
}

// Group entry modules by banned label; split into hard failures vs. allowlisted.
const failures = []; // { label, id, metaUid }
const residuals = []; // { label, id, reason, metaUid }
for (const { metaUid, id } of entryIds) {
  for (const b of BANNED) {
    if (!b.test(id)) continue;
    const allow = ALLOWLIST.find((a) => a.test(id));
    if (allow) residuals.push({ label: b.label, id, reason: allow.reason, metaUid });
    else failures.push({ label: b.label, id, metaUid });
    break;
  }
}

// Entry chunk on-disk size (raw + gzipped) for reproducible measurement.
let sizeLine = '';
try {
  const buf = rf(join(repoRoot, 'build', entryName));
  const raw = buf.length;
  const gzip = gz(buf).length;
  sizeLine = `entry chunk ${basename(entryName)}: ${(raw / 1024).toFixed(1)} KB raw / ${(gzip / 1024).toFixed(1)} KB gz`;
} catch {
  sizeLine = `entry chunk ${basename(entryName)}: (on-disk file not found)`;
}

console.log(`Entry-chunk audit — ${entryName}`);
console.log(sizeLine);
console.log(`entry modules: ${entryIds.length}`);
console.log('');

// Report allowlisted residuals (informational, gate stays green).
if (residuals.length) {
  const byLabel = new Map();
  for (const r of residuals) byLabel.set(r.label, (byLabel.get(r.label) || []).concat(r));
  for (const [label, list] of byLabel) {
    console.log(`DOCUMENTED RESIDUAL: ${label} — ${list.length} module part(s) in entry (allowlisted)`);
    console.log(`  reason: ${list[0].reason}`);
    const chain = nearestChain(list[0].metaUid);
    console.log('  nearest in-entry importer chain:');
    chain.forEach((id, i) => console.log('    ' + '  '.repeat(i) + short(id)));
    console.log('');
  }
}

// Report hard failures with import chains, and set exit code.
if (failures.length) {
  const byLabel = new Map();
  for (const f of failures) byLabel.set(f.label, (byLabel.get(f.label) || []).concat(f));
  console.error(`FAIL: ${failures.length} banned module part(s) found in the entry chunk.`);
  for (const [label, list] of byLabel) {
    console.error(`\n  [${label}] ${list.length} part(s), e.g.:`);
    for (const f of list.slice(0, 5)) {
      console.error('    - ' + short(f.id));
      const chain = nearestChain(f.metaUid);
      console.error('      importer chain:');
      chain.forEach((id, i) => console.error('        ' + '  '.repeat(i) + short(id)));
    }
    if (list.length > 5) console.error(`    ... and ${list.length - 5} more`);
  }
  process.exit(1);
}

console.log('PASS: no banned modules in the entry chunk beyond documented residuals.');
process.exit(0);
