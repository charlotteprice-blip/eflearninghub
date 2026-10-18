// Organisations with prepaid Learning Hub places, in Firestore organisations/{id} of the learninghub database.
// An access code is shown once and stored only as a hash, so keep a copy for the organisation.
//
//   npm run orgs -- list
//   npm run orgs -- add --id wynn-williams --name "Wynn Williams" --domains wynnwilliams.co.nz --seats 20 --contract-end 2027-06-30
//   npm run orgs -- add --id nzls --name "New Zealand Law Society" --seats 300 --contract-end 2027-03-31 --arms law
//   npm run orgs -- code wynn-williams        a new access code; the old one stops working at once
//
// Rerunning add with the same --id updates the name, domains, places, end date and arms; places in use are kept.
// Needs Google application default credentials for an owner of the project:
//   gcloud auth application-default login
//   gcloud auth application-default set-quota-project ef-client-hub
// Against the emulators instead: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run orgs -- list

import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { hashCode, cleanCode } = require('./core.js');

const PROJECT = process.env.LEARNINGHUB_PROJECT ?? 'ef-client-hub';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const [command, ...rest] = process.argv.slice(2);
const opts = Object.fromEntries(rest.reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
  return acc;
}, []));

function usage(message) {
  if (message) console.error(`\n${message}`);
  console.error('\nUsage:\n  npm run orgs -- list\n  npm run orgs -- add --id <id> --name "<name>" [--domains a.co.nz,b.co.nz] --seats <n> --contract-end <yyyy-mm-dd> [--arms law,health] [--code <code>]\n  npm run orgs -- code <id>\n');
  process.exit(1);
}
const newCode = () => Array.from({ length: 12 }, () => CHARS[crypto.randomInt(CHARS.length)]).join('');
const show = (code) => code.replace(/(.{4})(?=.)/g, '$1-');
const nzDate = (d) => new Intl.DateTimeFormat('en-NZ', { timeZone: 'Pacific/Auckland', day: 'numeric', month: 'long', year: 'numeric' }).format(d);

if (!['list', 'add', 'code'].includes(command)) usage();

const app = initializeApp(process.env.FIRESTORE_EMULATOR_HOST ? { projectId: 'demo-learninghub' } : { credential: applicationDefault(), projectId: PROJECT });
const db = getFirestore(app, 'learninghub');
const col = db.collection('organisations');

try {
  if (command === 'list') {
    const snap = await col.orderBy('name').get();
    if (snap.empty) console.log('\nNo organisations yet.\n');
    else {
      console.log('');
      for (const d of snap.docs) {
        const o = d.data();
        const ends = o.contractEnd?.toDate ? o.contractEnd.toDate() : new Date(o.contractEnd);
        console.log(`${d.id.padEnd(22)} ${String(o.seatsUsed ?? 0).padStart(4)} of ${String(o.seatsTotal ?? 0).padEnd(4)} places  until ${nzDate(ends)}  ${o.name}${o.emailDomains?.length ? `  (${o.emailDomains.join(', ')})` : ''}${o.arms?.length ? `  arms: ${o.arms.join(', ')}` : ''}`);
      }
      console.log('');
    }
  }

  if (command === 'add') {
    const id = String(opts.id ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!id || typeof opts.name !== 'string') usage('--id and --name are required.');
    const seats = Number(opts.seats);
    if (!Number.isInteger(seats) || seats < 1) usage('--seats must be a whole number.');
    if (typeof opts['contract-end'] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(opts['contract-end'])) usage('--contract-end must look like 2027-06-30.');
    // The end of the end day in New Zealand standard time; in daylight saving it runs an hour longer, never shorter.
    const contractEnd = new Date(`${opts['contract-end']}T23:59:59+12:00`);
    const list = (v) => (typeof v === 'string' ? v.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean) : []);
    const ref = col.doc(id);
    const snap = await ref.get();
    const code = typeof opts.code === 'string' ? cleanCode(opts.code) : snap.exists ? null : newCode();
    await ref.set({
      name: opts.name, emailDomains: list(opts.domains), seatsTotal: seats, contractEnd,
      ...(opts.arms ? { arms: list(opts.arms) } : {}),
      ...(code ? { accessCodeHash: hashCode(code) } : {}),
      ...(snap.exists ? {} : { seatsUsed: 0, createdAt: new Date() }),
      updatedAt: new Date(),
    }, { merge: true });
    console.log(`\n${snap.exists ? 'Updated' : 'Added'} ${opts.name} (${id}): ${seats} places until ${nzDate(contractEnd)}.`);
    console.log(code ? `Access code (shown once, not stored): ${show(code)}\n` : 'Access code unchanged. Use npm run orgs -- code <id> for a new one.\n');
  }

  if (command === 'code') {
    const id = rest[0];
    if (!id) usage('Give the organisation id.');
    const ref = col.doc(id);
    if (!(await ref.get()).exists) usage(`No organisation called ${id}.`);
    const code = newCode();
    await ref.set({ accessCodeHash: hashCode(code), updatedAt: new Date() }, { merge: true });
    console.log(`\nNew access code for ${id} (shown once, not stored): ${show(code)}\nThe previous code no longer works.\n`);
  }
} catch (err) {
  if (/default credentials|Could not load the default/i.test(err.message)) console.error('\nRun gcloud auth application-default login first.\n');
  else console.error(`\n${err.message}\n`);
  process.exit(1);
}
