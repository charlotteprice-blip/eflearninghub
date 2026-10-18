// Sets up the Stripe customer portal for the Learning Hub, through the API rather than the dashboard.
// Members can: cancel at the end of the period they have paid for, update their card, change between the
// Library monthly and annual prices, update their billing details and download invoices.
// Run through ./tasks stripe:portal (it asks for the key). Run ./tasks stripe:prices first: the monthly and
// annual prices must exist. The partner and organisation seat prices are left out of plan changes.
//
// The default portal configuration (the one used when no configuration is named) is updated in place.
// If the account has none yet, a new configuration is created and its ID printed.

import { createRequire } from "node:module";
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY || "";
if (!key) { console.error("Set STRIPE_SECRET_KEY first, or use ./tasks stripe:portal."); process.exit(1); }
if (/_live_/.test(key) && !process.argv.includes("--live")) { console.error("That is a live key. Add --live if you mean to change the live portal."); process.exit(1); }
const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
const SITE = "https://app.executiveframe.co.nz";

const prices = await stripe.prices.list({ lookup_keys: ["library_monthly", "library_annual"], active: true, limit: 10, expand: ["data.product"] });
if (prices.data.length < 2) { console.error("The library_monthly and library_annual prices are missing. Run ./tasks stripe:prices first."); process.exit(1); }
const product = typeof prices.data[0].product === "string" ? prices.data[0].product : prices.data[0].product.id;

// Arm-specific prices, if any, can also be switched between within the same product.
const armPrices = (await stripe.prices.list({ product, active: true, limit: 100 })).data
  .filter(p => /^library_([a-z0-9]+_)?(monthly|annual)$/.test(p.lookup_key || ""));

const settings = {
  business_profile: { headline: "Executive Frame Learning Hub", privacy_policy_url: `${SITE}/privacy/` },
  default_return_url: `${SITE}/account/`,
  features: {
    customer_update: { enabled: true, allowed_updates: ["name", "email", "address"] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true, mode: "at_period_end", proration_behavior: "none",
      cancellation_reason: { enabled: true, options: ["too_expensive", "unused", "missing_features", "other"] }
    },
    subscription_update: {
      enabled: true, default_allowed_updates: ["price"], proration_behavior: "create_prorations",
      products: [{ product, prices: armPrices.map(p => p.id) }]
    }
  }
};

const list = await stripe.billingPortal.configurations.list({ limit: 100 });
const current = list.data.find(c => c.is_default);
if (current) {
  await stripe.billingPortal.configurations.update(current.id, settings);
  console.log(`Updated the default portal configuration (${current.id}).`);
} else {
  const made = await stripe.billingPortal.configurations.create(settings);
  console.log(`Created portal configuration ${made.id}. If billing does not open, set it as the default in the Stripe dashboard (Settings, Billing, Customer portal).`);
}
console.log(`Plan changes allowed between: ${armPrices.map(p => p.lookup_key).join(", ")}`);
console.log("Cancelling takes effect at the end of the paid period. Return link: " + settings.default_return_url);
