// Uploads a workbook PDF to the Learning Hub library bucket, where getDownloadLink serves it to members.
//
//   npm run upload -- "Autonomy workbook.pdf" all      becomes library/all/autonomy-workbook.pdf
//   npm run upload -- law-skills.pdf law               becomes library/law/law-skills.pdf
//   npm run upload -- list                             lists the library
//
// Uses gcloud, logged in as an owner of ef-client-hub.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';

const BUCKET = process.env.LEARNINGHUB_BUCKET ?? 'executiveframe-learninghub';
const PROJECT = process.env.LEARNINGHUB_PROJECT ?? 'ef-client-hub';
const ARMS = ['all', 'law', 'health', 'elite', 'corporate', 'women', 'neurodiversity', 'family', 'c3'];
const [file, arm] = process.argv.slice(2);

function gcloud(args) {
  const r = spawnSync('gcloud', [...args, `--project=${PROJECT}`], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

if (file === 'list') gcloud(['storage', 'ls', '--recursive', `gs://${BUCKET}/library/`]);
if (!file || !arm) {
  console.error('\nUsage:\n  npm run upload -- <file.pdf> <arm>\n  npm run upload -- list\n\nArms: ' + ARMS.join(', ') + '\n');
  process.exit(1);
}
if (!existsSync(file)) { console.error(`\nNo file at ${file}\n`); process.exit(1); }
if (!ARMS.includes(arm)) { console.error(`\n${arm} is not an arm. Use one of: ${ARMS.join(', ')}\n`); process.exit(1); }
const name = basename(file).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');
if (!/^[a-z0-9][a-z0-9._-]{0,120}\.pdf$/.test(name)) { console.error('\nOnly PDF files can be uploaded.\n'); process.exit(1); }
console.log(`\nUploading to library/${arm}/${name}\nUse this path in the topic file: "path": "library/${arm}/${name}"\n`);
gcloud(['storage', 'cp', file, `gs://${BUCKET}/library/${arm}/${name}`, '--content-type=application/pdf']);
