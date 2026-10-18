// Adds or updates an organisation with prepaid Learning Hub places, in Firestore organisations/{id}.
// The access code is shown once and stored only as a hash, so keep a copy for the organisation.
//
// Easiest: ./tasks org:add with the same options. Directly, sign in first with an account that can write to the project:
//   gcloud auth application-default login
// Then, from the repository root:
//   node scripts/add-organisation.mjs --id wynn-williams --name "Wynn Williams" \
//     --domains wynnwilliams.co.nz --seats 20 --contract-end 2027-06-30 [--code ABCD-EFGH-JKLM] [--arms law]
// --code is optional: without it a 12 character code is made. --arms limits the topics (default: all).
// To try it against the emulators instead: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node scripts/add-organisation.mjs ...

import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { hashCode, cleanCode } = require("../functions/core.js");

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
  return acc;
}, []));
const need = k => { if (!args[k] || args[k] === true) { console.error(`Missing --${k}`); process.exit(1); } return String(args[k]); };

const id = need("id").toLowerCase().replace(/[^a-z0-9-]/g, "-");
const name = need("name");
const seats = Number(need("seats"));
if (!Number.isInteger(seats) || seats < 1) { console.error("--seats must be a whole number"); process.exit(1); }
const endDay = need("contract-end");
if (!/^\d{4}-\d{2}-\d{2}$/.test(endDay)) { console.error("--contract-end must look like 2027-06-30"); process.exit(1); }
// The end of the end day in New Zealand standard time; in daylight saving it runs an hour longer, never shorter.
const contractEnd = new Date(`${endDay}T23:59:59+12:00`);
const domains = args.domains && args.domains !== true ? String(args.domains).split(",").map(d => d.trim().toLowerCase()).filter(Boolean) : [];
const arms = args.arms && args.arms !== true ? String(args.arms).split(",").map(a => a.trim()).filter(Boolean) : [];

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const code = args.code && args.code !== true ? cleanCode(String(args.code))
  : Array.from({ length: 12 }, () => CHARS[crypto.randomInt(CHARS.length)]).join("");

initializeApp({ projectId: process.env.GCLOUD_PROJECT || "executiveframe-app" });
const db = getFirestore();
const ref = db.collection("organisations").doc(id);
const snap = await ref.get();
const record = {
  name, emailDomains: domains, accessCodeHash: hashCode(code), seatsTotal: seats, contractEnd,
  ...(arms.length ? { arms } : {}),
  ...(snap.exists ? {} : { seatsUsed: 0, createdAt: new Date() }),
  updatedAt: new Date()
};
await ref.set(record, { merge: true });

console.log(`${snap.exists ? "Updated" : "Added"} ${name} (${id}): ${seats} places until ${endDay}${domains.length ? `, domains ${domains.join(", ")}` : ""}.`);
console.log(`Access code (shown once, not stored): ${code.replace(/(.{4})(?=.)/g, "$1-")}`);
