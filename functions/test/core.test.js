"use strict";
// Unit tests for core.js with an in-memory Firestore, Stripe and Storage. Run: npm test (in functions/).
const test = require("node:test");
const assert = require("node:assert/strict");
const { build, hashCode, TRIAL_DOWNLOAD_LIMIT } = require("../core");

// ---- Fakes ----
const isObj = v => v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);
const merge = (a, b) => { const out = { ...a }; for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(a[k]) ? merge(a[k], v) : v; return out; };
function fakeDb() {
  const data = {};
  const col = name => (data[name] = data[name] || {});
  const docRef = (name, id) => ({
    id, _col: name,
    async get() { const d = col(name)[id]; return { exists: !!d, id, data: () => (d ? structuredClone(d) : undefined) }; },
    async set(v, opt) { col(name)[id] = opt && opt.merge ? merge(col(name)[id] || {}, v) : v; }
  });
  const query = (name, filters, n) => ({
    where(f, op, v) { return query(name, [...filters, [f, op, v]], n); },
    limit(k) { return query(name, filters, k); },
    async get() {
      let docs = Object.entries(col(name)).filter(([, d]) => filters.every(([f, op, v]) => op === "==" ? d[f] === v : Array.isArray(d[f]) && d[f].includes(v)));
      if (n) docs = docs.slice(0, n);
      docs = docs.map(([id, d]) => ({ id, data: () => structuredClone(d) }));
      return { empty: !docs.length, docs };
    }
  });
  return {
    data,
    collection: name => ({ doc: id => docRef(name, id), ...query(name, []) }),
    async runTransaction(fn) {
      return fn({ get: ref => ref.get(), set: (ref, v, opt) => ref.set(v, opt) });
    }
  };
}
function fakeStripe() {
  const s = { customers: [], subs: [], sessions: [], prices: [
    { id: "price_m", lookup_key: "library_monthly" }, { id: "price_a", lookup_key: "library_annual" },
    { id: "price_law_m", lookup_key: "library_law_monthly" },
    { id: "price_p_m", lookup_key: "partner_monthly" }, { id: "price_seat", lookup_key: "organisation_seat" }
  ] };
  const sub = (customer, key, status, extra = {}) => ({ id: "sub_" + (s.subs.length + 1), customer, status, created: s.subs.length + 1, metadata: {}, items: { data: [{ price: { lookup_key: key }, current_period_end: 1893456000 }] }, ...extra });
  s.addSub = (...a) => { const x = sub(...a); s.subs.push(x); return x; };
  return {
    _: s,
    customers: { create: async p => { const c = { id: "cus_" + (s.customers.length + 1), ...p }; s.customers.push(c); return c; } },
    subscriptions: {
      list: async ({ customer }) => ({ data: s.subs.filter(x => x.customer === customer) }),
      create: async p => s.addSub(p.customer, s.prices.find(x => x.id === p.items[0].price).lookup_key, "active", { metadata: p.metadata })
    },
    prices: { list: async ({ lookup_keys }) => ({ data: s.prices.filter(p => lookup_keys.includes(p.lookup_key)) }) },
    checkout: { sessions: { create: async p => { s.sessions.push(p); return { url: "https://checkout.stripe.test/" + s.sessions.length }; } } },
    billingPortal: { sessions: { create: async p => ({ url: "https://billing.stripe.test/" + p.customer }) } }
  };
}
const bucket = { file: path => ({ exists: async () => [path !== "library/all/missing.pdf"], getSignedUrl: async () => ["https://storage.test/" + path] }) };
const NOW = new Date("2026-10-18T00:00:00Z");
const req = (uid, email, data = {}, verified = true) => ({
  auth: { uid, token: { email, email_verified: verified } }, data,
  rawRequest: { headers: { origin: "https://app.executiveframe.co.nz" } }
});
function setup() {
  const db = fakeDb(), stripe = fakeStripe();
  return { db, stripe, api: build({ stripe, db, bucket, now: () => NOW }) };
}

// ---- Tests ----
test("new member has no access, a trial available and no organisation offer", async () => {
  const { api } = setup();
  const a = await api.checkAccess(req("u1", "a@example.com"));
  assert.equal(a.active, false);
  assert.equal(a.trialAvailable, true);
  assert.equal(a.organisationOffer, null);
});

test("checkout uses the arm price when it exists, records consent and gives a 7 day trial", async () => {
  const { api, stripe, db } = setup();
  const r = await api.createCheckoutSession(req("u1", "a@example.com", { arm: "law", interval: "monthly", privacyVersion: "v1" }));
  assert.match(r.url, /checkout/);
  const s = stripe._.sessions[0];
  assert.equal(s.line_items[0].price, "price_law_m");
  assert.equal(s.subscription_data.trial_period_days, 7);
  assert.equal(s.payment_method_collection, "always");
  assert.equal(db.data.members.u1.consents.privacy.version, "v1");
  assert.equal(db.data.members.u1.arm, "law");
});

test("checkout falls back to the library price and refuses without consent or an unknown interval", async () => {
  const { api, stripe } = setup();
  await api.createCheckoutSession(req("u1", "a@example.com", { arm: "health", interval: "annual", privacyVersion: "v1" }));
  assert.equal(stripe._.sessions[0].line_items[0].price, "price_a");
  await assert.rejects(api.createCheckoutSession(req("u2", "b@example.com", { interval: "monthly" })), /privacy/);
  await assert.rejects(api.createCheckoutSession(req("u2", "b@example.com", { interval: "weekly", privacyVersion: "v1" })), /monthly or annual/);
});

test("no second trial after an earlier subscription", async () => {
  const { api, stripe } = setup();
  await api.createCheckoutSession(req("u1", "a@example.com", { interval: "monthly", privacyVersion: "v1" }));
  stripe._.addSub("cus_1", "library_monthly", "canceled");
  await api.createCheckoutSession(req("u1", "a@example.com", { interval: "monthly", privacyVersion: "v1" }));
  assert.equal(stripe._.sessions[1].subscription_data.trial_period_days, undefined);
});

test("partner pricing tier uses the partner price", async () => {
  const { api, stripe, db } = setup();
  db.data.members = { u1: { pricingTier: "partner" } };
  await api.createCheckoutSession(req("u1", "a@example.com", { interval: "monthly", privacyVersion: "v1" }));
  assert.equal(stripe._.sessions[0].line_items[0].price, "price_p_m");
});

test("a trialing member is active with a download allowance", async () => {
  const { api, stripe, db } = setup();
  db.data.members = { u1: { stripeCustomerId: "cus_9" } };
  stripe._.addSub("cus_9", "library_monthly", "trialing", { trial_end: 1761350400 });
  const a = await api.checkAccess(req("u1", "a@example.com"));
  assert.equal(a.active, true);
  assert.equal(a.state, "trialing");
  assert.equal(a.downloadLimit, TRIAL_DOWNLOAD_LIMIT);
  assert.ok(a.trialEnd);
});

test("work email domain: offered, refused until verified, then claimed with a seat in Stripe", async () => {
  const { api, stripe, db } = setup();
  db.data.organisations = { org1: { name: "Firm", emailDomains: ["firm.co.nz"], seatsTotal: 2, seatsUsed: 0, contractEnd: new Date("2027-06-30") } };
  const offer = await api.checkAccess(req("u1", "a@firm.co.nz"));
  assert.deepEqual(offer.organisationOffer, { name: "Firm" });
  await assert.rejects(api.claimSeat(req("u1", "a@firm.co.nz", { privacyVersion: "v1" }, false)), err => err.details && err.details.reason === "verify-email");
  const r = await api.claimSeat(req("u1", "a@firm.co.nz", { privacyVersion: "v1" }));
  assert.equal(r.organisation.name, "Firm");
  assert.equal(db.data.organisations.org1.seatsUsed, 1);
  assert.equal(stripe._.subs[0].items.data[0].price.lookup_key, "organisation_seat");
  const a = await api.checkAccess(req("u1", "a@firm.co.nz"));
  assert.equal(a.state, "organisation");
  assert.equal(a.hasBilling, false);
  await assert.rejects(api.createPortalSession(req("u1", "a@firm.co.nz")), /organisation/);
});

test("access code: wrong codes are counted, a full organisation is refused, a good code works", async () => {
  const { api, db } = setup();
  db.data.organisations = {
    full: { name: "Full Ltd", accessCodeHash: hashCode("FULL-0001"), seatsTotal: 1, seatsUsed: 1, contractEnd: new Date("2027-01-01") },
    org2: { name: "Society", accessCodeHash: hashCode("ABCD-EFGH"), seatsTotal: 10, seatsUsed: 0, contractEnd: new Date("2027-01-01") }
  };
  await assert.rejects(api.claimSeat(req("u1", "a@gmail.com", { code: "NOPE-NOPE", privacyVersion: "v1" })), /not recognised/);
  assert.equal(db.data.members.u1.codeTries.count, 1);
  await assert.rejects(api.claimSeat(req("u1", "a@gmail.com", { code: "full0001", privacyVersion: "v1" })), /places are in use/);
  const r = await api.claimSeat(req("u1", "a@gmail.com", { code: "abcd efgh", privacyVersion: "v1" }));
  assert.equal(r.organisation.name, "Society");
});

test("an ended organisation contract gives no access", async () => {
  const { api, db } = setup();
  db.data.organisations = { old: { name: "Old", accessCodeHash: hashCode("OLD1-OLD1"), seatsTotal: 5, seatsUsed: 0, contractEnd: new Date("2026-01-01") } };
  await assert.rejects(api.claimSeat(req("u1", "a@gmail.com", { code: "OLD1-OLD1", privacyVersion: "v1" })), /access has ended/);
});

test("downloads: members only, path checked, trial limited, repeats free", async () => {
  const { api, stripe, db } = setup();
  await assert.rejects(api.getDownloadLink(req("u0", "z@example.com", { path: "library/all/a.pdf" })), /for members/);
  db.data.members = { u1: { stripeCustomerId: "cus_9" } };
  stripe._.addSub("cus_9", "library_monthly", "trialing", { trial_end: 1761350400 });
  await assert.rejects(api.getDownloadLink(req("u1", "a@example.com", { path: "../secret.pdf" })), /Unknown file/);
  await assert.rejects(api.getDownloadLink(req("u1", "a@example.com", { path: "library/all/missing.pdf" })), /not available/);
  for (let i = 0; i < TRIAL_DOWNLOAD_LIMIT; i++) {
    const r = await api.getDownloadLink(req("u1", "a@example.com", { path: `library/all/f${i}.pdf` }));
    assert.equal(r.downloadsUsed, i + 1);
  }
  const again = await api.getDownloadLink(req("u1", "a@example.com", { path: "library/all/f0.pdf" }));
  assert.equal(again.downloadsUsed, TRIAL_DOWNLOAD_LIMIT);
  await assert.rejects(api.getDownloadLink(req("u1", "a@example.com", { path: "library/all/extra.pdf" })), /free trial includes/);
});

test("payment pages refuse unknown origins", async () => {
  const { api } = setup();
  const r = req("u1", "a@example.com", { interval: "monthly", privacyVersion: "v1" });
  r.rawRequest.headers.origin = "https://evil.example";
  await assert.rejects(api.createCheckoutSession(r), /not allowed/);
});
