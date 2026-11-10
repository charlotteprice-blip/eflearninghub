// Content from Sarah's Notion: look before it goes live, run a sync by hand, or read the last report.
// The rules are in functions/content.js and functions/sync.js; the Notion side is in docs/notion-sync.md.
//
//   npm run content -- check     read Notion and print what would be published and what is wrong; changes nothing
//   npm run content -- sync      run the 15 minute sync now, from this computer
//   npm run content -- status    print the report from the last sync
//
// check and sync ask for the Notion key at a hidden prompt. It is not shown, stored or logged.
// sync and status need Google application default credentials for an owner of the project:
//   gcloud auth application-default login

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { notionClient, runSync, NOTION } = require('./sync.js');

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const PROJECT = process.env.LEARNINGHUB_PROJECT ?? 'ef-client-hub';
const [command] = process.argv.slice(2);
const c = { green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` };

if (!['check', 'sync', 'status'].includes(command)) {
  console.error('\nUsage:\n  npm run content -- check     what would be published, and what is wrong; changes nothing\n  npm run content -- sync      run the sync now\n  npm run content -- status    the report from the last sync\n');
  process.exit(1);
}

// A secret typed or pasted without showing it on screen or keeping it anywhere.
function askHidden(question) {
  if (!process.stdin.isTTY) { console.error('\nRun this in a terminal window, so the key can be typed at a hidden prompt.\n'); process.exit(1); }
  process.stdout.write(`${question} (hidden): `);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve) => {
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value.trim());
          return;
        }
        if (ch === '\u0003') { stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

// Stands in for Firestore during check, so nothing is written anywhere.
function memoryDb() {
  const data = {};
  const col = (name) => (data[name] ??= {});
  return {
    data,
    collection: (name) => ({
      doc: (id) => ({
        async get() { const d = col(name)[id]; return { exists: !!d, data: () => d }; },
        async set(v, opt) { col(name)[id] = opt?.merge ? { ...(col(name)[id] ?? {}), ...v } : v; },
        async delete() { delete col(name)[id]; },
      }),
      async get() { return { docs: Object.entries(col(name)).map(([id, d]) => ({ id, data: () => d })) }; },
    }),
  };
}

async function firestore() {
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: 'demo-learninghub' } : { credential: applicationDefault(), projectId: PROJECT });
  return getFirestore(app, 'learninghub');
}

const nz = (iso) => (iso ? new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : 'never');
function list(title, rows, colour) {
  if (!rows.length) return;
  console.log(`\n  ${colour(title)}`);
  for (const r of rows) {
    console.log(`    ${[r.id, r.title, r.slug && `(${r.slug})`].filter(Boolean).join('  ')}`);
    for (const line of r.problems ?? r.warnings ?? []) console.log(c.dim(`      ${line}`));
  }
}
function print(report, extra = []) {
  const R = report.resources, L = report.lessons;
  console.log(`\n${c.bold('Resource cards from the catalogue')}`);
  if (R.error) console.log(`  ${c.red('Could not be read:')} ${R.error}`);
  else console.log(`  ${c.green(String(R.published))} published`);
  list(`${R.problems.length} marked Published but left out`, R.problems, c.red);
  list('Style notes (still published)', R.warnings, c.yellow);

  console.log(`\n${c.bold('Lessons from the lessons database')}`);
  if (L.error) console.log(`  ${c.yellow(L.error)}`);
  else console.log(`  ${c.green(String(L.published))} published  ${c.dim(`${L.updated.length} written, ${L.unchanged} unchanged, ${L.removed.length} removed`)}`);
  if (L.kept.length) console.log(c.dim(`  Kept at their last good version: ${L.kept.join(', ')}`));
  if (L.removed.length) console.log(c.dim(`  Removed: ${L.removed.join(', ')}`));
  list(`${L.problems.length} marked Published but left out`, [...L.problems, ...extra], c.red);
  list('Style notes (still published)', L.warnings, c.yellow);
  console.log('');
}

try {
  if (command === 'status') {
    const snap = await (await firestore()).collection('content').doc('state').get();
    if (!snap.exists) console.log('\nNo sync has run yet.\n');
    else {
      const s = snap.data();
      console.log(`\nLast sync: ${nz(s.report?.at)}   cards last read: ${nz(s.resourcesSyncedAt)}   lessons last read: ${nz(s.lessonsSyncedAt)}`);
      print(s.report);
    }
  } else {
    console.log(`\nThe Notion key is the Internal Integration Secret of the Executive Frame Learning Hub integration in Sarah's workspace.`);
    const key = await askHidden('Notion key');
    if (!key) { console.error('\nNo key entered.\n'); process.exit(1); }
    const notion = notionClient(key);
    if (command === 'check') {
      const db = memoryDb();
      const report = await runSync({ notion, db, now: () => new Date(), config: NOTION });
      // A lesson must name a course that exists on the site, or the viewer has nowhere to show it.
      const courses = JSON.parse(readFileSync(join(root, 'public/content/courses.json'), 'utf8')).courses.map((x) => x.id);
      const orphans = Object.values(db.data.contentLessons ?? {}).filter((d) => !courses.includes(d.lesson.course))
        .map((d) => ({ title: d.lesson.title, slug: d.lesson.slug, problems: [`Course "${d.lesson.course}" is not in public/content/courses.json, so the lesson would not appear. Courses: ${courses.join(', ')}.`] }));
      console.log(c.dim('\nCheck only: nothing was changed.'));
      print(report, orphans);
    } else {
      const report = await runSync({ notion, db: await firestore(), now: () => new Date(), config: NOTION });
      console.log(c.dim('\nSynced. Members see changes within about 1 minute.'));
      print(report);
    }
  }
} catch (err) {
  console.error(`\n${c.red('Failed:')} ${err.message}\n`);
  if (/default credentials|Could not load/i.test(err.message)) console.error('Run: gcloud auth application-default login\n');
  process.exit(1);
}
