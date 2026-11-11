// Checks WCAG 2.2 contrast for every colour pairing the Learning Hub uses, read from public/assets/css/tokens.css.
// Text pairs need 4.5:1. Non text pairs (field borders, focus rings, progress bars) need 3:1.
// Exits with code 1 if any pair fails.   npm run contrast

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const css = readFileSync(join(root, 'public/assets/css/tokens.css'), 'utf8');
// tokens.css has a block generated from the brand pack (npm run tokens) and the app's own block: both are read.
const t = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [m[1], m[2]]));

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
  ['quiet ink (secondary text) on sky ground', t['ink-quiet'], t.ground, 4.5],
  ['quiet ink (secondary text) on warm white panel', t['ink-quiet'], t.panel, 4.5],
  ['quiet ink (secondary text) on the warm white reading ground', t['ink-quiet'], t['reading-ground'], 4.5],
  ['error on sky ground', t.error, t.ground, 4.5],
  ['error on warm white panel', t.error, t.panel, 4.5],
  ['button and card text on white (hover)', t['on-panel'], t.white, 4.5],
  ['button border (2px slate) on white (hover)', t.slate, t.white, 3],
  ['field text on warm white field', t['on-panel'], t.panel, 4.5],
  ['field border (2px slate) on sky ground', t.slate, t.ground, 3],
  // Application colours from the brand pack: each on its own tint (notices, status pills) and on warm white
  ['success on its tint', t.success, t['success-tint'], 4.5],
  ['success on warm white panel', t.success, t.panel, 4.5],
  ['warning on its tint', t.warning, t['warning-tint'], 4.5],
  ['warning on warm white panel', t.warning, t.panel, 4.5],
  ['error on its tint', t.error, t['error-tint'], 4.5],
  ['info on its tint', t.info, t['info-tint'], 4.5],
  ['info on warm white panel', t.info, t.panel, 4.5],
  ['status done (success) on its tint', t['status-done'], t['status-done-tint'], 4.5],
  ['status in progress (info) on its tint', t['status-progress'], t['status-progress-tint'], 4.5],
  ['status attention (warning) on its tint', t['status-attention'], t['status-attention-tint'], 4.5],
  // A notice's own text is ink on the tint; its word and icon are the application colour (the pairs above)
  ['notice text: ink on success tint', t.ink, t['success-tint'], 4.5],
  ['notice text: ink on warning tint', t.ink, t['warning-tint'], 4.5],
  ['notice text: ink on error tint', t.ink, t['error-tint'], 4.5],
  ['notice text: ink on info tint', t.ink, t['info-tint'], 4.5],
  ['primary button: warm white on navy', t['on-primary'], t.primary, 4.5],
  ['error badge: warm white on brick', t.panel, t.error, 4.5],
  ['field border (2px slate) on warm white panel', t.slate, t.panel, 3],
  ['focus ring on sky ground', t.focus, t.ground, 3],
  ['focus ring on warm white panel', t.focus, t.panel, 3],
  ['progress bar (ink) on sky ground', t.ink, t.ground, 3],
  ['call to action text on navy', t['cta-ink'], t['cta-ground'], 4.5],
  ['navy on sky (inverted panel)', t['cta-on-panel'], t['cta-panel'], 4.5],
  ['active triangle point: warm white on ink', t.panel, t.ink, 4.5],
];

let failed = 0;

// Brand pack rules the stylesheets must keep (the same check as the Client Hub's): no shadows anywhere, and no
// colour written into a rule. Every colour is a token in tokens.css, so the palette cannot drift.
for (const file of ['public/assets/css/base.css', 'public/assets/css/hub.css', 'public/assets/css/viewer.css']) {
  const sheet = readFileSync(join(root, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    for (const decl of m[2].split(';')) {
      const [prop, ...rest] = decl.split(':');
      const name = (prop ?? '').trim();
      const value = rest.join(':').trim();
      if (!name || !value) continue;
      if (name === 'box-shadow' && value !== 'none') {
        failed += 1;
        console.log(`FAIL  box-shadow on "${selector}" in ${file}: surfaces are flat, use a border or a change of tone`);
      }
      if (!name.startsWith('--') && !value.startsWith('url(') && /#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(value)) {
        failed += 1;
        console.log(`FAIL  colour written into "${selector}" (${name}: ${value}) in ${file}: use a token`);
      }
    }
  }
}
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
console.log('\nAll pairings pass. No shadows, and no colour written into a rule.');
