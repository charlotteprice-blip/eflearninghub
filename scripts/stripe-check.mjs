// Checks that Stripe is ready for the Learning Hub: key mode, every lookup key the functions use, and the portal.
// Run through ./tasks stripe:check. Changes nothing.

import { createRequire } from "node:module";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY || "";
if (!key) { console.error("Set STRIPE_SECRET_KEY first, or use ./tasks stripe:check."); process.exit(1); }
const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
let problems = 0;
const line = (good, text) => { if (!good) problems++; console.log(`  ${good ? "ok  " : "MISSING"}  ${text}`); };

console.log(`Key: ${/_live_/.test(key) ? "LIVE mode" : "test mode"}${/^rk_/.test(key) ? ", restricted" : ", full secret key (use a restricted key for the app)"}`);

const keys = ["library_monthly", "library_annual", "partner_monthly", "partner_annual", "organisation_seat"];
const found = await stripe.prices.list({ lookup_keys: keys, active: true, limit: 20 });
for (const k of keys) {
  const p = found.data.find(x => x.lookup_key === k);
  line(!!p, p ? `${k}: NZ$${(p.unit_amount / 100).toFixed(2)} a ${p.recurring ? p.recurring.interval : "?"}, ${p.tax_behavior === "inclusive" ? "GST included" : "tax " + p.tax_behavior}` : k);
  if (p && p.currency !== "nzd") line(false, `${k} is not in NZD`);
}

const portal = (await stripe.billingPortal.configurations.list({ limit: 100 })).data.find(c => c.is_default);
line(!!portal, "Default customer portal configuration");
if (portal) {
  const f = portal.features;
  line(f.subscription_cancel.enabled && f.subscription_cancel.mode === "at_period_end", "Cancel at the end of the period");
  line(f.payment_method_update.enabled, "Card updates");
  line(f.subscription_update.enabled, "Monthly and annual switching");
}

console.log(problems ? `\n${problems} item(s) to fix. See docs/setup.md.` : "\nStripe is ready.");
console.log("Not checkable by API (do in the dashboard): customer emails, branding, team members.");
process.exitCode = problems ? 1 : 0;
