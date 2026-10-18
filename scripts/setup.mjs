// Sets up everything the Learning Hub needs in Firebase and Google Cloud from the terminal, in place of clicking
// through the Firebase console. Works the same way as the Client Hub's npm run setup.
//
//   npm run setup:check            report what exists and what is missing (changes nothing)
//   npm run setup                  make each missing piece, asking before every change
//   npm run setup -- --dry-run     check, then print the commands it would run, change nothing
//   npm run setup -- --plan        print every command in order without checking anything
//   npm run setup -- --yes         make every missing piece without asking (secrets are still asked for)
//   npm run setup -- --only=database,site
//
// The Learning Hub lives in the Client Hub's project, ef-client-hub, so 1 login works in both apps. It has its own
// Firestore database (learninghub), Hosting site and Storage bucket (executiveframe-learninghub) and functions
// codebase (learning), so neither app's deploys can reach the other's records.
//
// Needs: Node 20+, the Firebase CLI (installed by npm install) and the Google Cloud CLI (gcloud), each logged in
// as an owner of ef-client-hub:
//   npx firebase login
//   gcloud auth login
//
// Every step checks before it acts, so running it again is safe.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const firebaseBin = join(root, 'node_modules/.bin/firebase');

const CONFIG = {
  project: process.env.LEARNINGHUB_PROJECT ?? 'ef-client-hub',
  region: 'australia-southeast1',
  database: 'learninghub',
  site: process.env.LEARNINGHUB_SITE ?? 'executiveframe-learninghub',
  bucket: process.env.LEARNINGHUB_BUCKET ?? 'executiveframe-learninghub',
  target: 'learning',
  domain: 'app.executiveframe.co.nz',
  appName: 'Executive Frame Learning Hub',
  secret: 'STRIPE_SECRET_KEY',
};
const HANDLERS = [CONFIG.site + '.web.app', CONFIG.site + '.firebaseapp.com', CONFIG.domain, CONFIG.project + '.firebaseapp.com']
  .map((h) => `https://${h}/__/auth/handler`);

const APIS = [
  'firebase.googleapis.com',
  'firebasehosting.googleapis.com',
  'firestore.googleapis.com',
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'identitytoolkit.googleapis.com',
  'cloudfunctions.googleapis.com',
  'run.googleapis.com',
  'cloudbuild.googleapis.com',
  'artifactregistry.googleapis.com',
  'eventarc.googleapis.com',
  'secretmanager.googleapis.com',
  'iamcredentials.googleapis.com',
];

const args = process.argv.slice(2);
const checkOnly = args.includes('check');
const plan = args.includes('--plan');
const dryRun = args.includes('--dry-run') || plan;
const yes = args.includes('--yes');
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');

// ---------- helpers ----------

const c = { green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` };

function show(cmd, list) {
  return [cmd === firebaseBin ? 'npx firebase' : cmd, ...list].map((p) => (/[\s"']/.test(p) ? `'${p}'` : p)).join(' ');
}

function run(cmd, list, { capture = true, input } = {}) {
  if (dryRun) {
    console.log(c.dim(`  would run: ${show(cmd, list)}`));
    return { ok: true, out: '', dry: true };
  }
  const r = spawnSync(cmd, list, { encoding: 'utf8', stdio: capture ? ['pipe', 'pipe', 'pipe'] : 'inherit', input, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, out: '', err: r.error.message };
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

// Read only commands still run during a dry run, so the plan is accurate.
function look(cmd, list) {
  const r = spawnSync(cmd, list, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) return { ok: false, out: '', err: r.error.message };
  return { ok: r.status === 0, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

function why(r) {
  const line = `${r.err}\n${r.out}`
    .split('\n')
    .map((l) => l.replace(/\x1b\[[0-9;]*m/g, '').trim())
    .find((l) => l && !/^(npm (warn|notice)|\(node:\d+\))/i.test(l));
  return line ? line.slice(0, 200) : 'no error message';
}

function firebaseLogin() {
  const r = look(firebaseBin, ['login:list', '--json']);
  if (!r.ok) return null;
  try {
    const parsed = JSON.parse(r.out);
    const accounts = Array.isArray(parsed.result) ? parsed.result : [];
    return accounts.map((a) => a.user?.email ?? a.email).filter(Boolean);
  } catch {
    return /logged in as/i.test(r.out) ? [r.out.match(/logged in as\s+(\S+)/i)?.[1] ?? 'unknown'] : [];
  }
}

const fb = (list) => [firebaseBin, [...list, '--project', CONFIG.project]];
const gc = (list) => ['gcloud', [...list, `--project=${CONFIG.project}`]];
const lookJson = (cmd, list) => {
  const r = look(cmd, list);
  if (!r.ok) return null;
  try {
    return JSON.parse(r.out);
  } catch {
    return null;
  }
};
const readRc = () => JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8'));

function token() {
  const r = look('gcloud', ['auth', 'print-access-token']);
  if (!r.ok) throw new Error('gcloud is not logged in. Run: gcloud auth login');
  return r.out;
}

async function rest(method, url, body) {
  if (dryRun && method !== 'GET') {
    console.log(c.dim(`  would call: ${method} ${url}${body ? ` ${JSON.stringify(body).replace(/"clientSecret":"[^"]*"/, '"clientSecret":"(hidden)"')}` : ''}`));
    return { ok: true, data: {} };
  }
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'x-goog-user-project': CONFIG.project },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

let rl = null;
async function confirm(question) {
  if (yes || dryRun) return true;
  rl ??= createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`  ${question} ${c.bold('[y/N]')} `);
  return /^y(es)?$/i.test(answer.trim());
}
async function ask(question) {
  if (dryRun) return 'VALUE';
  rl ??= createInterface({ input: process.stdin, output: process.stdout });
  return (await rl.question(`  ${question}: `)).trim();
}
// A secret typed or pasted without showing it on screen or keeping it anywhere.
async function askHidden(question) {
  if (dryRun) return 'SECRET';
  rl?.close();
  rl = null;
  process.stdout.write(`  ${question} (hidden): `);
  const stdin = process.stdin;
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
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

const idpUrl = (id) => `https://identitytoolkit.googleapis.com/admin/v2/projects/${CONFIG.project}/defaultSupportedIdpConfigs/${id}`;
async function idpState(id) {
  const r = await rest('GET', idpUrl(id)).catch(() => ({ ok: false }));
  return r.ok ? r.data : null;
}
async function idpSave(id, clientId, clientSecret, exists) {
  const body = { enabled: true, clientId, clientSecret };
  const r = exists
    ? await rest('PATCH', `${idpUrl(id)}?updateMask=enabled,clientId,clientSecret`, body)
    : await rest('POST', `https://identitytoolkit.googleapis.com/admin/v2/projects/${CONFIG.project}/defaultSupportedIdpConfigs?idpId=${id}`, body);
  return r.ok ? { ok: true } : { ok: false, err: JSON.stringify(r.data) };
}

// ---------- steps ----------

const steps = [
  {
    id: 'tools',
    title: 'Tools and logins',
    async check() {
      const problems = [];
      const node = Number(process.versions.node.split('.')[0]);
      if (node < 20) problems.push(`Node ${process.versions.node} is too old; install Node 22 (nvm install 22)`);
      if (!existsSync(firebaseBin)) problems.push('Firebase CLI missing; run npm install');
      if (!look('gcloud', ['--version']).ok) problems.push('gcloud missing; install the Google Cloud CLI (brew install --cask google-cloud-sdk)');
      if (!look('java', ['-version']).ok) problems.push('Java missing (only needed for npm run test:rules); brew install openjdk@21');
      if (existsSync(firebaseBin)) {
        const accounts = firebaseLogin();
        if (!accounts || accounts.length === 0) problems.push('Firebase CLI not logged in; run npx firebase login');
        else {
          const list = look(firebaseBin, ['projects:list', '--json']);
          if (!list.ok) problems.push(`Firebase CLI is logged in as ${accounts.join(', ')} but cannot list projects (${why(list)}); try npx firebase login --reauth`);
        }
      }
      if (look('gcloud', ['--version']).ok) {
        if (!look('gcloud', ['auth', 'print-access-token']).ok) problems.push('gcloud not logged in; run gcloud auth login');
        const current = look('gcloud', ['config', 'get-value', 'project']);
        if (current.ok && current.out && current.out !== CONFIG.project) problems.push(`gcloud is pointed at project ${current.out}; run gcloud config set project ${CONFIG.project}`);
      }
      return problems.length ? { state: 'missing', detail: problems } : { state: 'done' };
    },
    manual: 'Fix the items listed, then run this again.',
  },
  {
    id: 'project',
    title: `Firebase project ${CONFIG.project} (shared with the Client Hub)`,
    async check() {
      const describe = look('gcloud', ['projects', 'describe', CONFIG.project, '--format=value(projectNumber)']);
      if (describe.ok && describe.out) {
        const firebase = lookJson(firebaseBin, ['projects:list', '--json']);
        if (!firebase) return { state: 'unknown', detail: [`Project ${CONFIG.project} exists but the Firebase CLI cannot list projects`] };
        return firebase.result?.some((p) => p.projectId === CONFIG.project) ? { state: 'done' } : { state: 'missing', detail: [`Firebase is not added to ${CONFIG.project}`] };
      }
      return { state: 'missing', detail: [`${CONFIG.project} is not visible to this login (${why(describe)})`] };
    },
    manual: 'The Client Hub setup creates this project. Run the Client Hub setup first, or log in as an owner of it, then run this again.',
  },
  {
    id: 'apis',
    title: 'Google Cloud APIs',
    async check() {
      const r = look(...gc(['services', 'list', '--enabled', '--format=value(config.name)']));
      if (!r.ok) return { state: 'unknown', detail: [r.err.split('\n')[0]] };
      const enabled = new Set(r.out.split('\n'));
      this.missing = APIS.filter((a) => !enabled.has(a));
      return this.missing.length ? { state: 'missing', detail: this.missing } : { state: 'done' };
    },
    async apply() {
      return run(...gc(['services', 'enable', ...(this.missing ?? APIS)]), { capture: false });
    },
  },
  {
    id: 'database',
    title: `Firestore database "${CONFIG.database}" in ${CONFIG.region}, point in time recovery and delete protection on`,
    async check() {
      const d = lookJson(firebaseBin, ['firestore:databases:get', CONFIG.database, '--json', '--project', CONFIG.project]);
      if (!d) {
        this.mode = 'create';
        return { state: 'missing' };
      }
      const db = d.result ?? d;
      const problems = [];
      if (db.locationId && db.locationId !== CONFIG.region) problems.push(`exists in ${db.locationId}, not ${CONFIG.region}; this cannot be changed`);
      if (db.pointInTimeRecoveryEnablement !== 'POINT_IN_TIME_RECOVERY_ENABLED') {
        this.mode = 'pitr';
        problems.push('point in time recovery is off');
      }
      return problems.length ? { state: 'missing', detail: problems } : { state: 'done' };
    },
    async apply() {
      if (this.mode === 'pitr') return run(...fb(['firestore:databases:update', CONFIG.database, '--point-in-time-recovery', 'ENABLED', '--delete-protection', 'ENABLED']), { capture: false });
      return run(...fb(['firestore:databases:create', CONFIG.database, '--location', CONFIG.region, '--point-in-time-recovery', 'ENABLED', '--delete-protection', 'ENABLED']), { capture: false });
    },
  },
  {
    id: 'site',
    title: `Hosting site "${CONFIG.site}" linked to the ${CONFIG.target} target`,
    async check() {
      const sites = lookJson(firebaseBin, ['hosting:sites:list', '--json', '--project', CONFIG.project]);
      if (!sites) return { state: 'unknown', detail: ['Could not list Hosting sites'] };
      const exists = (sites.result?.sites ?? sites.result ?? []).some((s) => s.name?.endsWith(`/sites/${CONFIG.site}`));
      const linked = readRc().targets?.[CONFIG.project]?.hosting?.[CONFIG.target]?.includes(CONFIG.site);
      this.exists = exists;
      if (exists && linked) return { state: 'done' };
      return { state: 'missing', detail: [exists ? 'site exists but is not linked to the target' : 'site does not exist'] };
    },
    async apply() {
      if (!this.exists) {
        const r = run(...fb(['hosting:sites:create', CONFIG.site]), { capture: false });
        if (!r.ok) return r;
      }
      return run(...fb(['target:apply', 'hosting', CONFIG.target, CONFIG.site]), { capture: false });
    },
  },
  {
    id: 'bucket',
    title: `Storage bucket "${CONFIG.bucket}" in ${CONFIG.region}, added to Firebase, linked to the ${CONFIG.target} target`,
    async check() {
      const b = lookJson('gcloud', ['storage', 'buckets', 'describe', `gs://${CONFIG.bucket}`, '--format=json', `--project=${CONFIG.project}`]);
      this.exists = Boolean(b);
      const problems = [];
      if (!b) problems.push('bucket does not exist');
      else if (b.location && b.location.toLowerCase() !== CONFIG.region) problems.push(`bucket is in ${b.location}, not ${CONFIG.region}`);
      if (b) {
        const fbBucket = await rest('GET', `https://firebasestorage.googleapis.com/v1beta/projects/${CONFIG.project}/buckets/${CONFIG.bucket}`).catch(() => ({ ok: false }));
        this.added = fbBucket.ok;
        if (!fbBucket.ok) problems.push('bucket is not yet added to Firebase');
      }
      this.linked = readRc().targets?.[CONFIG.project]?.storage?.[CONFIG.target]?.includes(CONFIG.bucket);
      if (!this.linked) problems.push('bucket is not linked to the storage target');
      return problems.length ? { state: 'missing', detail: problems } : { state: 'done' };
    },
    async apply() {
      if (!this.exists) {
        const r = run(...gc(['storage', 'buckets', 'create', `gs://${CONFIG.bucket}`, `--location=${CONFIG.region}`, '--uniform-bucket-level-access', '--public-access-prevention']), { capture: false });
        if (!r.ok) return r;
      }
      if (!this.added) {
        const r = await rest('POST', `https://firebasestorage.googleapis.com/v1beta/projects/${CONFIG.project}/buckets/${CONFIG.bucket}:addFirebase`, {});
        if (!r.ok) return { ok: false, err: JSON.stringify(r.data) };
      }
      return this.linked ? { ok: true } : run(...fb(['target:apply', 'storage', CONFIG.target, CONFIG.bucket]), { capture: false });
    },
  },
  {
    id: 'webapp',
    title: `Web app "${CONFIG.appName}" registered, settings written to public/assets/js/firebase-config.js`,
    async check() {
      const apps = lookJson(firebaseBin, ['apps:list', 'WEB', '--json', '--project', CONFIG.project]);
      if (!apps) return { state: 'unknown', detail: ['Could not list apps'] };
      const app = (apps.result ?? []).find((a) => a.displayName === CONFIG.appName);
      this.appId = app?.appId;
      const written = !readFileSync(join(root, 'public/assets/js/firebase-config.js'), 'utf8').includes('REPLACE_ME');
      if (app && written) return { state: 'done' };
      return { state: 'missing', detail: [app ? 'settings not yet written into firebase-config.js' : 'web app not registered'] };
    },
    async apply() {
      if (!this.appId) {
        const r = run(...fb(['apps:create', 'WEB', CONFIG.appName, '--json']));
        if (dryRun || !r.ok) return r;
        this.appId = JSON.parse(r.out).result?.appId;
      }
      const r = run(...fb(['apps:sdkconfig', 'WEB', this.appId, '--json']));
      if (dryRun || !r.ok) return r;
      const cfg = JSON.parse(r.out).result?.sdkConfig ?? JSON.parse(r.out).result;
      writeConfig(cfg);
      console.log(c.dim('  Commit it: git add public/assets/js/firebase-config.js && git commit -m "Add Firebase web app settings" && git push'));
      return { ok: true };
    },
  },
  {
    id: 'authdomains',
    title: `Authentication: email and password on, sign in allowed from ${CONFIG.domain} and the site's own addresses`,
    async check() {
      const r = await rest('GET', `https://identitytoolkit.googleapis.com/admin/v2/projects/${CONFIG.project}/config`).catch((e) => ({ ok: false, data: { error: e.message } }));
      if (!r.ok) return { state: 'unknown', detail: ['Could not read the Authentication settings. Open Authentication in the Firebase console once and press Get started, then run this again.'] };
      const current = r.data.authorizedDomains ?? [];
      const wanted = [CONFIG.domain, `${CONFIG.site}.web.app`, `${CONFIG.site}.firebaseapp.com`];
      this.next = [...new Set([...current, ...wanted])];
      const problems = wanted.filter((d) => !current.includes(d)).map((d) => `${d} not authorised`);
      this.emailOff = !r.data.signIn?.email?.enabled;
      if (this.emailOff) problems.push('email and password sign in is off');
      return problems.length ? { state: 'missing', detail: problems } : { state: 'done' };
    },
    async apply() {
      const body = { authorizedDomains: this.next };
      const mask = ['authorizedDomains'];
      if (this.emailOff !== false) {
        body.signIn = { email: { enabled: true, passwordRequired: true } };
        mask.push('signIn.email.enabled', 'signIn.email.passwordRequired');
      }
      const r = await rest('PATCH', `https://identitytoolkit.googleapis.com/admin/v2/projects/${CONFIG.project}/config?updateMask=${mask.join(',')}`, body);
      return r.ok ? { ok: true } : { ok: false, err: JSON.stringify(r.data) };
    },
  },
  {
    id: 'microsoft',
    title: 'Microsoft sign in ("Continue with Microsoft")',
    async check() {
      const s = await idpState('microsoft.com');
      this.exists = Boolean(s);
      if (s?.enabled && s.clientId) return { state: 'done' };
      return { state: 'missing', detail: [s ? 'set up but switched off' : 'not set up', `redirect addresses for the Entra app: ${HANDLERS.join(', ')}`] };
    },
    async apply() {
      let clientId;
      let clientSecret;
      if (look('az', ['--version']).ok && (await confirm('Create the Microsoft Entra app registration now with the Azure CLI (az login first)?'))) {
        const app = run('az', ['ad', 'app', 'create', '--display-name', CONFIG.appName, '--sign-in-audience', 'AzureADandPersonalMicrosoftAccount', '--web-redirect-uris', ...HANDLERS, '--query', 'appId', '-o', 'tsv']);
        if (!app.ok) return app;
        clientId = app.out;
        // The secret goes straight from Azure to Firebase; it is never printed.
        const cred = run('az', ['ad', 'app', 'credential', 'reset', '--id', clientId, '--display-name', 'Firebase', '--years', '2', '--query', 'password', '-o', 'tsv']);
        if (!cred.ok) return cred;
        clientSecret = cred.out;
        console.log(c.dim(`  Entra application (client) ID ${clientId}; its secret expires in 24 months.`));
      } else {
        console.log(c.dim(`  Entra admin centre, App registrations: add these redirect addresses, then paste the IDs. ${HANDLERS.join(', ')}`));
        clientId = await ask('Entra application (client) ID');
        clientSecret = await askHidden('Entra client secret');
      }
      if (!clientId || !clientSecret) return { ok: false, err: 'No ID or secret entered' };
      return idpSave('microsoft.com', clientId, clientSecret, this.exists);
    },
  },
  {
    id: 'google',
    title: 'Google sign in ("Continue with Google")',
    async check() {
      const s = await idpState('google.com');
      this.exists = Boolean(s);
      if (s?.enabled && s.clientId) return { state: 'done' };
      return { state: 'missing', detail: [s ? 'set up but switched off' : 'not set up'] };
    },
    async apply() {
      console.log(c.dim('  Easiest: Firebase console, Authentication, Sign in method, Google, Enable (it makes the OAuth client), then run this again.'));
      console.log(c.dim(`  Or paste an existing OAuth web client whose redirect addresses include: ${HANDLERS.join(', ')}`));
      if (!(await confirm('Paste an existing OAuth web client now?'))) return { ok: true, skipped: true };
      const clientId = await ask('OAuth client ID');
      const clientSecret = await askHidden('OAuth client secret');
      if (!clientId || !clientSecret) return { ok: false, err: 'No ID or secret entered' };
      return idpSave('google.com', clientId, clientSecret, this.exists);
    },
  },
  {
    // Applies to both apps, so it never runs unless named: npm run setup -- --only=passwordpolicy
    id: 'passwordpolicy',
    optIn: true,
    title: 'Password policy for the shared login (10 characters, a number and a symbol; applies to the Client Hub too)',
    async check() {
      const r = await rest('GET', `https://identitytoolkit.googleapis.com/admin/v2/projects/${CONFIG.project}/config`).catch(() => ({ ok: false }));
      if (!r.ok) return { state: 'unknown', detail: ['Could not read the Authentication settings'] };
      return r.data.passwordPolicyConfig?.passwordPolicyEnforcementState === 'ENFORCE' ? { state: 'done' } : { state: 'missing', detail: ['not enforced; the Learning Hub pages ask for it, the Client Hub pages do not'] };
    },
    async apply() {
      const body = { passwordPolicyConfig: { passwordPolicyEnforcementState: 'ENFORCE', forceUpgradeOnSignin: false, passwordPolicyVersions: [{ customStrengthOptions: { minPasswordLength: 10, containsNumericCharacter: true, containsNonAlphanumericCharacter: true } }] } };
      const r = await rest('PATCH', `https://identitytoolkit.googleapis.com/admin/v2/projects/${CONFIG.project}/config?updateMask=passwordPolicyConfig`, body);
      return r.ok ? { ok: true } : { ok: false, err: JSON.stringify(r.data) };
    },
  },
  {
    id: 'auditlogs',
    title: 'Audit logs record every read of the Firestore databases (shared with the Client Hub)',
    async check() {
      const policy = lookJson('gcloud', ['projects', 'get-iam-policy', CONFIG.project, '--format=json']);
      if (!policy) return { state: 'unknown', detail: ['Could not read the project access policy'] };
      this.policy = policy;
      const cfg = (policy.auditConfigs ?? []).find((a) => a.service === 'datastore.googleapis.com');
      const types = new Set((cfg?.auditLogConfigs ?? []).map((l) => l.logType));
      return types.has('DATA_READ') && types.has('DATA_WRITE') ? { state: 'done' } : { state: 'missing', detail: ['Data Read and Data Write logs for Cloud Firestore are off'] };
    },
    async apply() {
      const policy = this.policy;
      policy.auditConfigs ??= [];
      let cfg = policy.auditConfigs.find((a) => a.service === 'datastore.googleapis.com');
      if (!cfg) {
        cfg = { service: 'datastore.googleapis.com', auditLogConfigs: [] };
        policy.auditConfigs.push(cfg);
      }
      for (const logType of ['DATA_READ', 'DATA_WRITE']) if (!cfg.auditLogConfigs.some((l) => l.logType === logType)) cfg.auditLogConfigs.push({ logType });
      const file = join(mkdtempSync(join(tmpdir(), 'learninghub-')), 'policy.json');
      writeFileSync(file, JSON.stringify(policy));
      return run('gcloud', ['projects', 'set-iam-policy', CONFIG.project, file, '--format=none'], { capture: false });
    },
  },
  {
    // Newer Google organisations no longer give the default service account broad access. The functions need to
    // build, write logs, use Firestore, read the library bucket and sign short download links.
    id: 'functionsaccess',
    title: 'Cloud Functions service account can build, use Firestore, read the library bucket and sign download links',
    roles: ['roles/cloudbuild.builds.builder', 'roles/datastore.user', 'roles/logging.logWriter'],
    sa() {
      if (this.cached) return this.cached;
      const number = look('gcloud', ['projects', 'describe', CONFIG.project, '--format=value(projectNumber)']);
      this.cached = number.ok && number.out ? `${number.out}-compute@developer.gserviceaccount.com` : null;
      return this.cached;
    },
    async check() {
      const sa = this.sa();
      if (!sa) return { state: 'unknown', detail: ['Could not read the project number'] };
      const member = `serviceAccount:${sa}`;
      const policy = lookJson('gcloud', ['projects', 'get-iam-policy', CONFIG.project, '--format=json']);
      if (!policy) return { state: 'unknown', detail: ['Could not read the project access policy'] };
      const held = new Set((policy.bindings ?? []).filter((b) => (b.members ?? []).includes(member)).map((b) => b.role));
      this.missingRoles = this.roles.filter((r) => !held.has(r));
      const saPolicy = lookJson('gcloud', ['iam', 'service-accounts', 'get-iam-policy', sa, '--format=json', `--project=${CONFIG.project}`]) ?? {};
      this.needsSigning = !(saPolicy.bindings ?? []).some((b) => b.role === 'roles/iam.serviceAccountTokenCreator' && (b.members ?? []).includes(member));
      const bucketPolicy = lookJson('gcloud', ['storage', 'buckets', 'get-iam-policy', `gs://${CONFIG.bucket}`, '--format=json', `--project=${CONFIG.project}`]) ?? {};
      this.needsBucket = !(bucketPolicy.bindings ?? []).some((b) => b.role === 'roles/storage.objectViewer' && (b.members ?? []).includes(member));
      const detail = [
        ...this.missingRoles.map((r) => `${sa} lacks ${r}`),
        ...(this.needsSigning ? [`${sa} cannot sign download links (roles/iam.serviceAccountTokenCreator on itself)`] : []),
        ...(this.needsBucket ? [`${sa} cannot read gs://${CONFIG.bucket} (roles/storage.objectViewer)`] : []),
      ];
      return detail.length ? { state: 'missing', detail } : { state: 'done' };
    },
    async apply() {
      const sa = this.sa() ?? 'PROJECT_NUMBER-compute@developer.gserviceaccount.com';
      const member = `serviceAccount:${sa}`;
      for (const role of this.missingRoles ?? this.roles) {
        const r = run('gcloud', ['projects', 'add-iam-policy-binding', CONFIG.project, `--member=${member}`, `--role=${role}`, '--condition=None', '--format=none']);
        if (!r.ok) return r;
      }
      if (this.needsSigning !== false) {
        const r = run('gcloud', ['iam', 'service-accounts', 'add-iam-policy-binding', sa, `--member=${member}`, '--role=roles/iam.serviceAccountTokenCreator', `--project=${CONFIG.project}`, '--format=none']);
        if (!r.ok) return r;
      }
      if (this.needsBucket !== false) {
        const r = run('gcloud', ['storage', 'buckets', 'add-iam-policy-binding', `gs://${CONFIG.bucket}`, `--member=${member}`, '--role=roles/storage.objectViewer', `--project=${CONFIG.project}`, '--format=none']);
        if (!r.ok) return r;
      }
      return { ok: true };
    },
  },
  {
    id: 'secret',
    title: `Stripe key saved in Secret Manager as ${CONFIG.secret}`,
    async check() {
      const r = look(...gc(['secrets', 'versions', 'list', CONFIG.secret, '--filter=state=ENABLED', '--format=value(name)']));
      if (r.ok && r.out) return { state: 'done' };
      return { state: 'missing', detail: [r.ok ? 'secret exists with no enabled version' : 'secret not created yet', "use the restricted key from Sarah's Executive Frame Stripe account (test mode until launch)"] };
    },
    async apply() {
      // The Firebase CLI asks for the value itself, hidden, and stores it directly.
      rl?.close();
      rl = null;
      return run(...fb(['functions:secrets:set', CONFIG.secret]), { capture: false });
    },
  },
  {
    id: 'domain',
    title: `Custom domain ${CONFIG.domain} on the Hosting site`,
    async check() {
      const r = await rest('GET', `https://firebasehosting.googleapis.com/v1beta1/projects/${CONFIG.project}/sites/${CONFIG.site}/customDomains/${CONFIG.domain}`).catch(() => ({ ok: false }));
      if (!r.ok) return { state: 'missing', detail: ['domain not yet added to the site'] };
      if (r.data.hostState === 'HOST_ACTIVE') return { state: 'done' };
      printDns(r.data);
      return { state: 'waiting', detail: [`added, waiting for DNS (${r.data.hostState ?? r.data.ownershipState ?? 'pending'})`] };
    },
    async apply() {
      const r = await rest('POST', `https://firebasehosting.googleapis.com/v1beta1/projects/${CONFIG.project}/sites/${CONFIG.site}/customDomains?customDomainId=${CONFIG.domain}`, {});
      if (!r.ok) return { ok: false, err: JSON.stringify(r.data) };
      console.log('  Domain added. Firebase takes a minute to work out the DNS records; run npm run setup:check to print them.');
      return { ok: true };
    },
  },
  {
    id: 'access',
    title: 'Who can open the project console (report only)',
    async check() {
      const policy = lookJson('gcloud', ['projects', 'get-iam-policy', CONFIG.project, '--format=json']);
      if (!policy) return { state: 'unknown', detail: ['Could not read the project access policy'] };
      const wide = (policy.bindings ?? []).filter((b) => ['roles/owner', 'roles/editor', 'roles/firebase.admin', 'roles/datastore.user', 'roles/datastore.viewer'].includes(b.role));
      const lines = wide.flatMap((b) => b.members.filter((m) => m.startsWith('user:') || m.startsWith('group:')).map((m) => `${b.role.replace('roles/', '')}: ${m.replace(/^(user|group):/, '')}`));
      return { state: 'report', detail: lines.length ? lines : ['No people hold broad roles'] };
    },
  },
];

function writeConfig(cfg) {
  const file = join(root, 'public/assets/js/firebase-config.js');
  const src = readFileSync(file, 'utf8');
  const block = `export const firebaseConfig = {
  apiKey: '${cfg.apiKey}',
  // Switch to '${CONFIG.domain}' once the custom domain is live.
  authDomain: '${CONFIG.site}.web.app',
  projectId: '${cfg.projectId ?? CONFIG.project}',
  storageBucket: '${CONFIG.bucket}',
  messagingSenderId: '${cfg.messagingSenderId}',
  appId: '${cfg.appId}',
};`;
  writeFileSync(file, src.replace(/export const firebaseConfig = \{[\s\S]*?\};/, block));
  console.log(c.green('  Wrote public/assets/js/firebase-config.js'));
}

function printDns(info) {
  const records = (info.requiredDnsUpdates?.desired ?? []).flatMap((d) => (d.records ?? []).map((r) => ({ domain: d.domainName, ...r })));
  if (!records.length) return;
  console.log('  Add these records at the DNS host for executiveframe.co.nz, then log the change in the Site Changes Log:');
  for (const r of records) console.log(`    ${r.type.padEnd(6)} ${r.domainName ?? r.domain}  ${r.rdata}${r.requiredAction ? `  (${r.requiredAction.toLowerCase()})` : ''}`);
}

// ---------- run ----------

const icon = { done: c.green('done   '), missing: c.yellow('missing'), waiting: c.yellow('waiting'), unknown: c.red('unknown'), report: c.dim('report ') };

console.log(c.bold(`\nExecutive Frame Learning Hub setup  ·  project ${CONFIG.project}${dryRun ? '  ·  dry run' : ''}${checkOnly ? '  ·  check only' : ''}\n`));

if (plan) {
  const defaults = { missing: APIS, mode: 'create', exists: false, added: false, linked: false, emailOff: true, next: [CONFIG.domain, `${CONFIG.site}.web.app`, `${CONFIG.site}.firebaseapp.com`], policy: { auditConfigs: [] }, needsSigning: true, needsBucket: true };
  for (const step of steps) {
    if (!step.apply || (step.optIn && !only?.includes(step.id))) continue;
    console.log(c.bold(step.title));
    Object.assign(step, defaults);
    await step.apply();
  }
  console.log('');
  process.exit(0);
}

let blocked = false;
for (const step of steps) {
  if (only && !only.includes(step.id) && step.id !== 'tools') continue;
  if (!only && step.optIn) continue;
  if (blocked) {
    console.log(`${c.dim('skipped')}  ${step.title}`);
    continue;
  }
  let result;
  try {
    result = await step.check();
  } catch (e) {
    result = { state: 'unknown', detail: [e.message] };
  }
  console.log(`${icon[result.state]}  ${step.title}`);
  for (const d of result.detail ?? []) console.log(c.dim(`         ${d}`));

  if (['done', 'report', 'waiting'].includes(result.state)) continue;
  if (!step.apply) {
    if (step.manual) console.log(`         ${step.manual}`);
    if (['tools', 'project'].includes(step.id)) blocked = true;
    continue;
  }
  if (checkOnly || result.state === 'unknown') continue;
  if (!(await confirm(`Make this change in ${CONFIG.project}?`))) {
    console.log(c.dim('         left as it is'));
    continue;
  }
  const r = await step.apply();
  if (r?.skipped) console.log(c.dim('         left for the console'));
  else if (r?.ok) console.log(c.green(dryRun ? '         planned' : '         done'));
  else console.log(c.red(`         failed: ${(r?.err ?? 'see the output above').split('\n')[0]}`));
}

rl?.close();
console.log(
  `\nStill done outside the terminal: the DNS records at the executiveframe.co.nz DNS host, switching Google sign in on once in the Firebase console, and the Stripe dashboard settings (docs/firebase-setup.md).\nNext: npm run stripe -- check, then npm run deploy:rules, npm run deploy:functions, npm run deploy:hosting.\n`,
);
