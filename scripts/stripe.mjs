// Stripe set up for the Learning Hub, through the API, in Sarah's Executive Frame Stripe account
// (never the Charlotte Price Consulting account). Asks for the key at a hidden prompt; it is not shown or kept.
//
//   npm run stripe -- check
//   npm run stripe -- prices --monthly 0000 --annual 0000 --partner-monthly 0000 --partner-annual 0000
//   npm run stripe -- prices ... --arm law --arm-monthly 0000 --arm-annual 0000
//   npm run stripe -- portal
// Add --live to change live mode (refused otherwise). Amounts are in cents with GST included.

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

const root = join(dirname(new URL(import.meta.url).pathname), '..');
const scripts = { prices: 'stripe-setup.mjs', portal: 'stripe-portal.mjs', check: 'stripe-check.mjs' };
const [command, ...rest] = process.argv.slice(2);
if (!scripts[command]) {
  console.error('\nUsage:\n  npm run stripe -- check\n  npm run stripe -- prices --monthly <cents> --annual <cents> --partner-monthly <cents> --partner-annual <cents> [--arm <arm> --arm-monthly <cents> --arm-annual <cents>] [--live]\n  npm run stripe -- portal [--live]\n');
  process.exit(1);
}

function askHidden(question) {
  if (!process.stdin.isTTY) return Promise.resolve('');
  process.stdout.write(`${question} (hidden): `);
  return new Promise((resolve) => {
    let value = '';
    const stdin = process.stdin;
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          stdin.setRawMode(false); stdin.pause(); stdin.off('data', onData); process.stdout.write('\n');
          resolve(value.trim()); return;
        }
        if (ch === '\u0003') { stdin.setRawMode(false); process.stdout.write('\n'); process.exit(130); }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1); else value += ch;
      }
    };
    stdin.setRawMode(true); stdin.setEncoding('utf8'); stdin.resume(); stdin.on('data', onData);
  });
}

const key = process.env.STRIPE_SECRET_KEY || (await askHidden(`Stripe secret key for Sarah's Executive Frame account (sk_test_... for test mode)`));
if (!key) { console.error('\nNo key entered.\n'); process.exit(1); }
const r = spawnSync(process.execPath, [join(root, 'scripts', scripts[command]), ...rest], { stdio: 'inherit', env: { ...process.env, STRIPE_SECRET_KEY: key } });
process.exit(r.status ?? 1);
