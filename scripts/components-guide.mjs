// Builds the shared components guide for the Learning Hub and the Client Hub.   npm run guide
//
// Reads   docs/design-system/components.src.html   the guide chrome and every sample, written by hand
//         the Learning Hub's 4 CSS files, the Client Hub's 3 CSS files, the Figtree files, and from brand pack 1.1
//         in each app the lockup, the mark and the mark's paths
// Writes  docs/design-system/components.html       1 self contained page, no external requests
//
// The 2 apps reuse class names and token names with different rules, so each app's CSS is rewritten to live in
// a shadow root (:root, html and body become :host) and every sample is an <ef-sample app="lh|ch"> element.
// Forced states are generated from the apps' own :hover, :active and :focus rules, so they cannot drift.
// Nothing is written to either app, and the Client Hub is only read.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientHub = resolve(process.env.EF_CLIENTHUB || join(root, '..', 'efclienthub'));
const SRC = join(root, 'docs/design-system/components.src.html');
const OUT = join(root, 'docs/design-system/components.html');

const fail = (msg) => { console.error(`\nComponents guide not built.\n${msg}\n`); process.exit(1); };
const read = (path, what) => {
  if (!existsSync(path)) fail(`${what} is missing: ${path}`);
  return readFileSync(path, 'utf8');
};

if (!existsSync(clientHub)) {
  fail(`The Client Hub repository was not found at ${clientHub}.\nThe guide shows both apps, so it needs that folder beside this one (or set EF_CLIENTHUB to its path).`);
}

const APPS = {
  lh: { name: 'Learning Hub', base: join(root, 'public/assets/css'), files: ['tokens.css', 'base.css', 'hub.css', 'viewer.css'] },
  ch: { name: 'Client Hub', base: join(clientHub, 'public/css'), files: ['tokens.css', 'app.css', 'components.css'] },
};

// ---------- a small CSS reader: rules, groups (@media and friends) and other @ blocks ----------

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const squash = (s) => s.replace(/\s+/g, ' ').trim();

// Index of the character that closes the block opened at `open`, skipping quoted text.
function closing(css, open) {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    const c = css[i];
    if (c === '"' || c === "'") { i = css.indexOf(c, i + 1); if (i < 0) return css.length; continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return css.length;
}

function parse(css) {
  const nodes = [];
  let i = 0;
  while (i < css.length) {
    let j = i;
    let quote = null;
    for (; j < css.length; j++) {
      const c = css[j];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === '"' || c === "'") { quote = c; continue; }
      if (c === '{' || c === ';') break;
    }
    if (j >= css.length) break;
    const prelude = squash(css.slice(i, j));
    if (css[j] === ';') { if (prelude) nodes.push({ type: 'statement', text: prelude }); i = j + 1; continue; }
    const end = closing(css, j);
    const body = css.slice(j + 1, end);
    if (/^@(media|supports|container|layer)\b/.test(prelude)) nodes.push({ type: 'group', prelude, children: parse(body) });
    else if (prelude.startsWith('@')) nodes.push({ type: 'block', prelude, body: squash(body) });
    else nodes.push({ type: 'rule', selectors: splitList(prelude), body: squash(body) });
    i = end + 1;
  }
  return nodes;
}

// Splits a selector list on its top level commas.
function splitList(list) {
  const out = [];
  let depth = 0, start = 0, quote = null;
  for (let i = 0; i < list.length; i++) {
    const c = list[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1; }
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}

// ---------- shadow root rewrite ----------

// :root, html and body become :host; :root.x and body.x become :host(.x). A bare attribute selector that sets
// tokens (a theme switch such as [data-theme="inverted"]) also applies to the host.
function hostify(selector, setsTokens) {
  const m = selector.match(/^(:root|html|body)((?:[.#][\w-]+|\[[^\]]*\])*)(?![\w-])/);
  if (m) return [(m[2] ? `:host(${m[2]})` : ':host') + selector.slice(m[0].length)];
  if (setsTokens && /^(\[[^\]]*\])+$/.test(selector)) return [`:host(${selector})`, selector];
  return [selector];
}

// ---------- forced states ----------

const PSEUDO = /:focus-visible|:focus(?![\w-])|:hover(?![\w-])|:active(?![\w-])/g;
const STATE = { ':focus-visible': 'focus', ':focus': 'focus', ':hover': 'hover', ':active': 'pressed' };
const force = (selector) => selector.replace(PSEUDO, (p) => `[data-state="${STATE[p]}"]`);
const hasPseudo = (selector) => { PSEUDO.lastIndex = 0; return PSEUDO.test(selector); };

function emitRule(selectors, body) {
  const setsTokens = /(^|[;\s])--[\w-]+\s*:/.test(body);
  const list = [...new Set(selectors.flatMap((s) => hostify(s, setsTokens)))];
  return `${list.join(',')}{${body}}`;
}

// The app's rules for a shadow root, each followed by its forced state copy.
function shadowCss(nodes, counts, inGroup = false) {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'statement') continue;
    if (n.type === 'block') {
      if (/^@font-face\b/.test(n.prelude)) continue; // fonts are embedded once, in the page itself
      out += `${n.prelude}{${n.body}}\n`;
      continue;
    }
    if (n.type === 'group') {
      out += `${n.prelude}{\n${shadowCss(n.children, counts, true)}}\n`;
      const forced = forcedCss(n.children, counts);
      // Hover and pointer queries are dropped so a forced state shows on any device. Every other query (width,
      // container, reduced motion) keeps its wrapper, so a forced state obeys it as the real state does.
      if (forced) out += /\((any-)?(hover|pointer)\b/.test(n.prelude) && !/width|height/.test(n.prelude) ? forced : `${n.prelude}{\n${forced}}\n`;
      continue;
    }
    out += emitRule(n.selectors, n.body) + '\n';
    if (!inGroup) out += forcedCss([n], counts);
    if (n.selectors.some((s) => s.includes('::backdrop'))) counts.backdrops.push(n.body);
  }
  return out;
}

function forcedCss(nodes, counts) {
  let out = '';
  for (const n of nodes) {
    if (n.type !== 'rule') continue;
    const hit = n.selectors.filter(hasPseudo);
    if (!hit.length) continue;
    out += emitRule(hit.map(force), n.body) + '\n';
    counts.forced++;
  }
  return out;
}

// The app's CSS as it ships, for the phone frames: comments and @font-face removed, nothing else changed.
function rawCss(nodes) {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'statement') continue;
    if (n.type === 'block') { if (!/^@font-face\b/.test(n.prelude)) out += `${n.prelude}{${n.body}}\n`; }
    else if (n.type === 'group') out += `${n.prelude}{\n${rawCss(n.children)}}\n`;
    else out += `${n.selectors.join(',')}{${n.body}}\n`;
  }
  return out;
}

function buildApp(key) {
  const app = APPS[key];
  const css = app.files.map((f) => stripComments(read(join(app.base, f), `${app.name} stylesheet`))).join('\n');
  const nodes = parse(css);
  const counts = { forced: 0, backdrops: [] };
  let shadow = shadowCss(nodes, counts);
  // The dialog backdrop cannot be shown on a static dialog, so its fill is copied to a helper class.
  for (const body of counts.backdrops) shadow += `.cs-backdrop{${body}}\n`;
  const raw = rawCss(nodes);
  for (const text of [shadow, raw]) {
    const outside = [...text.matchAll(/url\(\s*["']?([^"')]+)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'));
    if (outside.length) fail(`${app.name} CSS loads a file the guide cannot embed: ${outside[0]}\nAdd it to scripts/components-guide.mjs or remove the rule from the sample.`);
    if (/<\/style/i.test(text)) fail(`${app.name} CSS contains "</style", which would break the page.`);
  }
  return { shadow, raw, forced: counts.forced };
}

// ---------- fonts and brand files ----------

const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const fonts = [300, 400, 500].map((w) => {
  const file = join(root, `public/assets/fonts/figtree-latin-${w}-normal.woff2`);
  if (!existsSync(file)) fail(`A Figtree file is missing: ${file}\nRun npm run vendor.`);
  return `@font-face{font-family:"Figtree";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(file).toString('base64')}) format("woff2");unicode-range:${LATIN}}`;
}).join('\n');

// The brand files, from brand pack 1.1 in each app. Images are embedded once, in a JSON block, and the page's own
// script gives them to every <img data-asset="name">, so a 17 KB lockup is not repeated in every sample.
const svgUri = (path, what) => `data:image/svg+xml;base64,${readFileSync(existing(path, what)).toString('base64')}`;
function existing(path, what) {
  if (!existsSync(path)) fail(`${what} is missing: ${path}\nIf the brand files were renamed, update the paths in scripts/components-guide.mjs.`);
  return path;
}
const assets = {
  'lh-lockup': svgUri(join(root, 'public/assets/brand/ef-lockup-slate.svg'), 'Learning Hub lockup'),
  'lh-mark-only': svgUri(join(root, 'public/assets/brand/ef-mark-slate.svg'), 'Learning Hub mark'),
  'ch-lockup': svgUri(join(clientHub, 'public/assets/brand/ef-lockup-slate.svg'), 'Client Hub lockup'),
};
// The 2 apps carry the same pack files; an identical file is stored once and pointed to.
for (const [name, uri] of Object.entries(assets)) {
  const first = Object.keys(assets).find((k) => assets[k] === uri);
  if (first !== name) assets[name] = `=${first}`;
}

// The Client Hub draws its inline mark from 2 paths in public/js/mark-paths.js.
const chPaths = read(join(clientHub, 'public/js/mark-paths.js'), 'Client Hub mark paths');
const chPath = (name) => {
  const m = chPaths.match(new RegExp(`export const ${name} = '([^']+)'`));
  if (!m) fail(`The Client Hub mark paths no longer export ${name}; update scripts/components-guide.mjs.`);
  return m[1];
};

// Values the source can use as {{name}}.
const snippets = {
  // The Learning Hub inlines this file in loading states (layout.js); it is still unless a parent has .draw
  'lh-mark': read(join(root, 'public/assets/brand/mark.svg'), 'Learning Hub mark').replace(/<!--[\s\S]*?-->/g, '').replace(/\s*\n\s*/g, '').replace(' role="img" aria-label="Executive Frame"', ' aria-hidden="true"'),
  'ch-loop-d': chPath('LOOP'),
  'ch-triangle-d': chPath('TRIANGLE'),
};

// ---------- assemble ----------

let html = read(SRC, 'The guide source');

// <template data-snippet="name">...</template> blocks in the source define more {{name}} values.
html = html.replace(/[ \t]*<template data-snippet="([\w-]+)">([\s\S]*?)<\/template>\n?/g, (_, name, body) => {
  snippets[name] = body.trim();
  return '';
});
for (let pass = 0; pass < 6 && /\{\{[\w-]+\}\}/.test(html); pass++) {
  html = html.replace(/\{\{([\w-]+)\}\}/g, (_, name) => {
    if (!(name in snippets)) fail(`The guide source uses {{${name}}}, which is not defined.`);
    return snippets[name];
  });
}

const built = { lh: buildApp('lh'), ch: buildApp('ch') };
const slots = {
  '/*@fonts*/': fonts,
  '/*@css:lh*/': built.lh.shadow,
  '/*@css:ch*/': built.ch.shadow,
  '/*@css:lh:raw*/': built.lh.raw,
  '/*@css:ch:raw*/': built.ch.raw,
  '/*@assets*/': JSON.stringify(assets),
};
for (const [slot, text] of Object.entries(slots)) {
  if (!html.includes(slot)) fail(`The guide source has lost its ${slot} placeholder.`);
  html = html.split(slot).join(`\n${text}`);
}
html = html.replace('<!doctype html>', '<!doctype html>\n<!-- Generated by npm run guide from docs/design-system/components.src.html and the 2 apps\' CSS. Do not edit this file: edit the source and run npm run guide. -->');

writeFileSync(OUT, html);
const samples = (html.match(/<ef-sample\b/g) || []).length;
console.log(`Wrote docs/design-system/components.html (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
console.log(`  ${samples} samples; forced state rules: Learning Hub ${built.lh.forced}, Client Hub ${built.ch.forced}`);
