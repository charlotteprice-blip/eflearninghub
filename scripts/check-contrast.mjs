// Checks WCAG 2.2 contrast for every colour pairing the Learning Hub uses, read from public/assets/css/tokens.css.
// Text pairs need 4.5:1. Non text pairs (field borders, focus rings, progress bars) need 3:1.
// Exits with code 1 if any pair fails.   npm run contrast

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const css = readFileSync(join(root, 'public/assets/css/tokens.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const t = Object.fromEntries([...rootBlock.matchAll(/--([a-z-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [m[1], m[2]]));

function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const checks = [
  ['ink on sky ground', t.ink, t.ground, 4.5],
  ['ink on warm white panel', t['on-panel'], t.panel, 4.5],
  ['error on sky ground', t.error, t.ground, 4.5],
  ['error on warm white panel', t.error, t.panel, 4.5],
  ['error on white field', t.error, '#FFFFFF', 4.5],
  ['field text on white field', t['on-panel'], '#FFFFFF', 4.5],
  ['field border (2px slate) on white field', t.slate, '#FFFFFF', 3],
  ['field border (2px slate) on warm white panel', t.slate, t.panel, 3],
  ['focus ring on sky ground', t.focus, t.ground, 3],
  ['focus ring on warm white panel', t.focus, t.panel, 3],
  ['progress bar (ink) on sky ground', t.ink, t.ground, 3],
  ['call to action text on navy', t['cta-ink'], t['cta-ground'], 4.5],
  ['navy on sky (inverted panel)', t['cta-on-panel'], t['cta-panel'], 4.5],
  ['active triangle point: warm white on ink', t.panel, t.ink, 4.5],
];

let failed = 0;
for (const [name, fg, bg, min] of checks) {
  if (!fg || !bg) { failed += 1; console.log(`FAIL  missing token for ${name}`); continue; }
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed += 1;
  console.log(`${ok ? 'pass' : 'FAIL'}  ${r.toFixed(2)}:1  (needs ${min}:1)  ${name}  ${fg} on ${bg}`);
}
if (failed) {
  console.error(`\n${failed} pairing(s) fail.`);
  process.exit(1);
}
console.log('\nAll pairings pass.');
