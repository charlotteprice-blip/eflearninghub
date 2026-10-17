// Creates the Learning Hub products and prices in Sarah's Executive Frame Stripe account.
// Prices are found by the functions through these lookup keys, so the same code runs in test and live mode.
//
// Run from the repository root, test mode first (amounts in cents, GST included):
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.mjs \
//     --monthly 0000 --annual 0000 --partner-monthly 0000 --partner-annual 0000
// Optional, for an arm with its own price:  --arm law --arm-monthly 0000 --arm-annual 0000
// A live key (sk_live_ or rk_live_) is refused unless --live is added.
//
// No amount is assumed: every price must be given. PLACEHOLDER until Sarah confirms the prices.

import { createRequire } from "node:module";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const Stripe = require("stripe");

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
  return acc;
}, []));
const key = process.env.STRIPE_SECRET_KEY || "";
if (!key) { console.error("Set STRIPE_SECRET_KEY first."); process.exit(1); }
if (/_live_/.test(key) && !args.live) { console.error("That is a live key. Add --live if you really mean to create live prices."); process.exit(1); }

const cents = name => {
  const v = args[name];
  if (v === undefined) { console.error(`Missing --${name} (amount in cents, GST included).`); process.exit(1); }
  if (!/^\d+$/.test(String(v))) { console.error(`--${name} must be a whole number of cents.`); process.exit(1); }
  return Number(v);
};

const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

async function product(name, description) {
  const found = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
  if (found.data.length) return found.data[0];
  return stripe.products.create({ name, description, tax_code: "txcd_10000000" });
}
async function price(productId, lookupKey, amount, interval, nickname) {
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (existing.data.length) { console.log(`  ${lookupKey}: already exists (${existing.data[0].id}), left unchanged`); return; }
  const p = await stripe.prices.create({
    product: productId, currency: "nzd", unit_amount: amount, tax_behavior: "inclusive",
    recurring: { interval }, lookup_key: lookupKey, nickname
  });
  console.log(`  ${lookupKey}: created ${p.id} (NZ$${(amount / 100).toFixed(2)} a ${interval})`);
}

const library = await product("Executive Frame Library", "Self paced topics and workshops in the Executive Frame Learning Hub.");
console.log(`Executive Frame Library (${library.id})`);
await price(library.id, "library_monthly", cents("monthly"), "month", "Monthly");
await price(library.id, "library_annual", cents("annual"), "year", "Annual");
// The discounted rate. Named neutrally, because a price name is visible in Stripe and on receipts.
await price(library.id, "partner_monthly", cents("partner-monthly"), "month", "Partner rate, monthly");
await price(library.id, "partner_annual", cents("partner-annual"), "year", "Partner rate, annual");
if (args.arm) {
  const arm = String(args.arm);
  await price(library.id, `library_${arm}_monthly`, cents("arm-monthly"), "month", `${arm} monthly`);
  await price(library.id, `library_${arm}_annual`, cents("arm-annual"), "year", `${arm} annual`);
}

const seat = await product("Organisation seat", "A place in the Learning Hub provided by an organisation. Organisations are invoiced separately.");
console.log(`Organisation seat (${seat.id})`);
await price(seat.id, "organisation_seat", 0, "month", "Organisation seat");

console.log("\nDone. Next: set up the customer portal in the Stripe dashboard (docs/console-setup.md).");
