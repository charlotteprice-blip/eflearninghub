"use strict";
// Executive Frame Learning Hub functions: the rules. index.js connects them to Cloud Functions, Stripe,
// Firestore and Cloud Storage. Adapted from the Themescape account functions (functions/core.js there).
// Region australia-southeast1. Stripe account: Sarah's Executive Frame account, test mode until launch.
//
// checkAccess           Is this person a member, and what should the Library and Account pages show?
//                       Read from Stripe on every call, as Themescape's membership function does.
// createCheckoutSession A Stripe Checkout session for the Executive Frame Library (monthly or annual),
//                       with one 7 day trial per person and the card collected up front.
// claimSeat             An organisation place, from an access code or a verified work email domain.
//                       Recorded in Stripe as a NZ$0 "Organisation seat" subscription, so access has one source.
// createPortalSession   The Stripe customer portal: cancel at period end, update card, monthly to annual.
// getDownloadLink       A 5 minute signed link to a library PDF, after the access check; trial downloads are limited.
//
// Prices are found by Stripe lookup key, never by price ID, so test and live mode use the same code:
//   library_monthly, library_annual                   the Executive Frame Library (one price for every arm)
//   library_<arm>_monthly, library_<arm>_annual       optional: a different price for one arm; used when present
//   partner_monthly, partner_annual                   PLACEHOLDER amount: the discounted rate (see pricingTier)
//   organisation_seat                                 NZ$0 monthly, for organisation places
// scripts/stripe-setup.mjs creates these in Stripe.

const crypto = require("crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Pinned so Stripe's behaviour cannot change underneath the code (same version as Themescape).
const STRIPE_API_VERSION = "2025-08-27.basil";

// Pages that may start Checkout or open billing; return addresses are built from the page's own origin.
const ORIGINS = [
  "https://app.executiveframe.co.nz",
  "https://executiveframe-app.web.app",
  "https://executiveframe-app.firebaseapp.com"
];
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const ARMS = ["law", "health", "elite", "corporate", "women", "neurodiversity", "family", "c3"];
const INTERVALS = ["monthly", "annual"];
const TRIAL_DAYS = 7;
// PLACEHOLDER: trial download allowance, assumed 5 in the September plan. Confirm with Sarah.
const TRIAL_DOWNLOAD_LIMIT = 5;
// false: every individual plan opens every topic (one library). true: a plan opens only its own arm's topics.
// Decided by Sarah's pricing choice; the Library, hubs and downloads all follow this setting.
const ACCESS_BY_ARM = false;
// Stripe Tax: switch on once Executive Frame's GST registration is entered in Stripe Tax.
const AUTOMATIC_TAX = false;
const LIVE = ["trialing", "active", "past_due"];
const SEAT_KEY = "organisation_seat";
const INDIVIDUAL = /^(?:library(?:_([a-z0-9]+))?|(partner))_(monthly|annual)$/;
const SIGNED_LINK_MINUTES = 5;
const CODE_TRIES = 10;
const PDF_PATH = /^library\/([a-z0-9-]+)\/([a-z0-9][a-z0-9._-]{0,120}\.pdf)$/;

const fail = (code, message, details) => { throw new HttpsError(code, message, details); };
const iso = s => (s ? new Date(s * 1000).toISOString() : null);
const toDate = v => (v ? (v.toDate ? v.toDate() : new Date(v)) : null);
const domainOf = email => (email.split("@")[1] || "").trim().toLowerCase();
const cleanCode = v => (typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "") : "");
// Access codes are stored only as this hash (scripts/add-organisation.mjs makes it the same way).
const hashCode = code => crypto.createHash("sha256").update("ef-access-code:" + cleanCode(code)).digest("hex");
const periodEnd = sub => (sub.items && sub.items.data[0] && sub.items.data[0].current_period_end) || sub.current_period_end || null;
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function who(request) {
  if (!request.auth) fail("unauthenticated", "Please log in.");
  const t = request.auth.token || {};
  if (!t.email) fail("failed-precondition", "This account has no email address.");
  return { uid: request.auth.uid, email: String(t.email).toLowerCase(), verified: t.email_verified === true };
}

function originOf(request) {
  const o = request.rawRequest && request.rawRequest.headers && request.rawRequest.headers.origin;
  if (o && (ORIGINS.includes(o) || LOCAL.test(o))) return o;
  fail("permission-denied", "This page is not allowed to start payments.");
}

// What a subscription is, read from its prices' lookup keys.
function describe(sub) {
  const keys = sub.items.data.map(i => (i.price && i.price.lookup_key) || "");
  if (keys.includes(SEAT_KEY)) return { kind: "seat" };
  const m = keys.map(k => INDIVIDUAL.exec(k)).find(Boolean);
  if (m) return { kind: "individual", arm: m[1] || (sub.metadata && sub.metadata.arm) || null, tier: m[2] ? "partner" : "standard", interval: m[3] };
  return { kind: "other" };
}

function build({ stripe, db, bucket, now }) {
  const memberRef = uid => db.collection("members").doc(uid);
  const orgRef = id => db.collection("organisations").doc(id);

  async function getMember(uid) {
    const snap = await memberRef(uid).get();
    return snap.exists ? snap.data() : {};
  }

  async function customerFor(uid, email, member) {
    if (member.stripeCustomerId) return member.stripeCustomerId;
    const c = await stripe.customers.create({ email, metadata: { firebaseUid: uid } }, { idempotencyKey: `customer-${uid}` });
    await memberRef(uid).set({ stripeCustomerId: c.id, email, updatedAt: now(), ...(member.createdAt ? {} : { createdAt: now() }) }, { merge: true });
    member.stripeCustomerId = c.id;
    return c.id;
  }

  async function subscriptionsOf(customer) {
    if (!customer) return [];
    const list = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
    return list.data.slice().sort((a, b) => b.created - a.created);
  }

  // The current access for a member: organisation seat first (no billing), then an individual plan.
  async function resolve(uid, email, member) {
    const subs = await subscriptionsOf(member.stripeCustomerId);
    const individual = subs.filter(s => describe(s).kind === "individual");
    const out = {
      active: false, state: "none", plan: null, interval: null, arm: member.arm || null, arms: "all",
      trialEnd: null, periodEnd: null, cancelAtPeriodEnd: false, organisation: null,
      hasBilling: individual.length > 0,
      trialAvailable: !individual.some(s => s.status !== "incomplete_expired"),
      downloadLimit: null, downloadsUsed: member.downloadsUsed || 0
    };

    const seat = subs.find(s => describe(s).kind === "seat" && LIVE.includes(s.status));
    if (seat) {
      const orgId = (seat.metadata && seat.metadata.organisationId) || member.organisationId;
      const snap = orgId ? await orgRef(orgId).get() : null;
      const org = snap && snap.exists ? snap.data() : null;
      const ends = org && toDate(org.contractEnd);
      if (org && ends && ends > now()) {
        return { ...out, active: true, state: "organisation", plan: "organisation",
          organisation: { name: org.name || "Your organisation", contractEnd: ends.toISOString() },
          arms: Array.isArray(org.arms) && org.arms.length ? org.arms : "all", seatSubscription: seat.id };
      }
      out.state = "organisation-ended";
      out.organisation = org ? { name: org.name || "Your organisation", contractEnd: ends ? ends.toISOString() : null } : null;
    }

    const current = individual.find(s => LIVE.includes(s.status));
    if (current) {
      const d = describe(current);
      return {
        ...out, active: true, state: current.status, plan: "individual", interval: d.interval, arm: d.arm || out.arm,
        arms: ACCESS_BY_ARM && d.arm ? [d.arm] : "all",
        trialEnd: current.status === "trialing" ? iso(current.trial_end) : null,
        periodEnd: iso(periodEnd(current)),
        cancelAtPeriodEnd: !!current.cancel_at_period_end || !!current.cancel_at,
        downloadLimit: current.status === "trialing" ? TRIAL_DOWNLOAD_LIMIT : null
      };
    }
    if (individual.length && out.state === "none") {
      const last = individual[0];
      return { ...out, state: "ended", interval: describe(last).interval, periodEnd: iso(last.ended_at || periodEnd(last)) };
    }
    return out;
  }

  // An organisation whose current contract covers this email's domain and still has places.
  async function organisationForDomain(email) {
    const domain = domainOf(email);
    if (!domain) return null;
    const snap = await db.collection("organisations").where("emailDomains", "array-contains", domain).limit(5).get();
    const at = now();
    const doc = snap.docs.find(d => {
      const o = d.data();
      const ends = toDate(o.contractEnd);
      return ends && ends > at && (o.seatsUsed || 0) < (o.seatsTotal || 0);
    });
    return doc ? { id: doc.id, ...doc.data() } : null;
  }

  async function checkAccess(request) {
    const { uid, email, verified } = who(request);
    const member = await getMember(uid);
    const access = await resolve(uid, email, member);
    delete access.seatSubscription;
    access.emailVerified = verified;
    access.organisationOffer = null;
    if (!access.active) {
      const org = await organisationForDomain(email);
      if (org) access.organisationOffer = { name: org.name || "Your organisation" };
    }
    return access;
  }

  function consent(privacyVersion) {
    const version = text(privacyVersion, 40);
    if (!version) fail("invalid-argument", "The privacy statement must be accepted.");
    return { privacy: { given: true, version, at: now() } };
  }

  async function priceFor(member, arm, interval) {
    const keys = member.pricingTier === "partner"
      ? [`partner_${interval}`]
      : [...(arm ? [`library_${arm}_${interval}`] : []), `library_${interval}`];
    const res = await stripe.prices.list({ lookup_keys: keys, active: true, limit: 10 });
    for (const k of keys) {
      const p = res.data.find(x => x.lookup_key === k);
      if (p) return p.id;
    }
    logger.error("Missing Stripe price", { lookupKeys: keys });
    fail("internal", "A price is missing.");
  }

  async function createCheckoutSession(request) {
    const { uid, email } = who(request);
    const site = originOf(request);
    const d = request.data || {};
    const interval = INTERVALS.includes(d.interval) ? d.interval : fail("invalid-argument", "Please choose monthly or annual.");
    const arm = ARMS.includes(d.arm) ? d.arm : null;
    const consents = consent(d.privacyVersion);

    const member = await getMember(uid);
    const customer = await customerFor(uid, email, member);
    await memberRef(uid).set({ email, consents, ...(arm ? { arm } : {}), updatedAt: now() }, { merge: true });

    const subs = await subscriptionsOf(customer);
    if (subs.some(s => LIVE.includes(s.status) && describe(s).kind !== "other")) fail("already-exists", "You already have access. Your plan is on your Account page.");
    // One free trial per person.
    const trial = !subs.some(s => describe(s).kind === "individual" && s.status !== "incomplete_expired");
    const price = await priceFor(member, arm, interval);
    const meta = { firebaseUid: uid, kind: "individual", ...(arm ? { arm } : {}) };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: uid,
      line_items: [{ price, quantity: 1 }],
      payment_method_types: ["card"],
      payment_method_collection: "always",
      allow_promotion_codes: true,
      automatic_tax: { enabled: AUTOMATIC_TAX },
      billing_address_collection: "auto",
      customer_update: { address: "auto", name: "auto" },
      subscription_data: {
        metadata: meta,
        ...(trial ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } } : {})
      },
      metadata: meta,
      success_url: `${site}/thank-you/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/join/?cancelled=1${arm ? `&arm=${arm}` : ""}`
    });
    return { url: session.url };
  }

  async function claimSeat(request) {
    const { uid, email, verified } = who(request);
    const d = request.data || {};
    const consents = consent(d.privacyVersion);
    const member = await getMember(uid);
    const code = cleanCode(d.code);

    // At most 10 wrong codes a day for each account, so codes cannot be guessed.
    const day = now().toISOString().slice(0, 10);
    const tries = member.codeTries && member.codeTries.day === day ? member.codeTries.count : 0;
    if (code && tries >= CODE_TRIES) fail("resource-exhausted", "Too many codes have been tried today. Please try again tomorrow, or ask your organisation to check the code.");

    let org = null;
    if (code) {
      const snap = await db.collection("organisations").where("accessCodeHash", "==", hashCode(code)).limit(1).get();
      if (snap.empty) {
        await memberRef(uid).set({ codeTries: { day, count: tries + 1 } }, { merge: true });
        fail("not-found", "This code was not recognised. Please check it and try again.");
      }
      org = { id: snap.docs[0].id, ...snap.docs[0].data() };
    } else {
      org = await organisationForDomain(email);
      if (!org) fail("not-found", "Your email address does not match an organisation with places in the Learning Hub.");
    }
    // Email verification is required before any organisation place is given.
    if (!verified) fail("failed-precondition", "Please confirm your email address first. We have sent you a link.", { reason: "verify-email" });
    const ends = toDate(org.contractEnd);
    if (!ends || ends <= now()) fail("failed-precondition", `${org.name || "This organisation"}'s access has ended. Please contact the person who manages it.`);

    const existing = await resolve(uid, email, member);
    if (existing.active && existing.plan === "organisation") return { ok: true, organisation: existing.organisation };
    if (existing.active) fail("failed-precondition", "You already have a paid plan. Please cancel it on your Account page first, so you are not charged as well as using your organisation's place.");

    // Hold the place first, then record it in Stripe; if Stripe fails, the place is given back.
    await db.runTransaction(async tx => {
      const ref = orgRef(org.id);
      const snap = await tx.get(ref);
      const o = snap.data() || {};
      if ((o.seatsUsed || 0) >= (o.seatsTotal || 0)) fail("resource-exhausted", `All of ${o.name || "your organisation"}'s places are in use. Please contact the person who manages access.`);
      tx.set(ref, { seatsUsed: (o.seatsUsed || 0) + 1, updatedAt: now() }, { merge: true });
      tx.set(memberRef(uid), { email, organisationId: org.id, consents, codeTries: { day, count: 0 }, updatedAt: now() }, { merge: true });
    });
    try {
      const customer = await customerFor(uid, email, member);
      const seatPrice = await stripe.prices.list({ lookup_keys: [SEAT_KEY], active: true, limit: 1 });
      if (!seatPrice.data.length) { logger.error("Missing Stripe price", { lookupKey: SEAT_KEY }); fail("internal", "A price is missing."); }
      await stripe.subscriptions.create({
        customer,
        items: [{ price: seatPrice.data[0].id }],
        metadata: { firebaseUid: uid, kind: "seat", organisationId: org.id }
      }, { idempotencyKey: `seat-${uid}-${org.id}-${day}` });
    } catch (err) {
      await db.runTransaction(async tx => {
        const ref = orgRef(org.id);
        const snap = await tx.get(ref);
        const o = snap.data() || {};
        tx.set(ref, { seatsUsed: Math.max(0, (o.seatsUsed || 0) - 1), updatedAt: now() }, { merge: true });
        tx.set(memberRef(uid), { organisationId: null, updatedAt: now() }, { merge: true });
      });
      throw err;
    }
    return { ok: true, organisation: { name: org.name || "Your organisation", contractEnd: ends.toISOString() } };
  }

  async function createPortalSession(request) {
    const { uid } = who(request);
    const site = originOf(request);
    const member = await getMember(uid);
    if (!member.stripeCustomerId) fail("failed-precondition", "There is no billing for this account yet.");
    const subs = await subscriptionsOf(member.stripeCustomerId);
    if (!subs.some(s => describe(s).kind === "individual")) fail("failed-precondition", "Your place is provided by your organisation, so there is no billing to manage.");
    const session = await stripe.billingPortal.sessions.create({ customer: member.stripeCustomerId, return_url: `${site}/account/` });
    return { url: session.url };
  }

  async function getDownloadLink(request) {
    const { uid, email } = who(request);
    const d = request.data || {};
    const m = PDF_PATH.exec(typeof d.path === "string" ? d.path : "");
    if (!m) fail("invalid-argument", "Unknown file.");
    const path = m[0], folder = m[1], name = m[2];
    const member = await getMember(uid);
    const access = await resolve(uid, email, member);
    if (!access.active) fail("permission-denied", "Downloads are for members. Your plan is on your Account page.");
    if (Array.isArray(access.arms) && folder !== "all" && !access.arms.includes(folder)) fail("permission-denied", "This file is not part of your membership.");
    const file = bucket.file(path);
    const [exists] = await file.exists();
    if (!exists) fail("not-found", "This file is not available yet. Please try again later.");

    let used = member.downloadsUsed || 0;
    if (access.state === "trialing") {
      // A file already downloaded in the trial can be downloaded again without counting twice.
      used = await db.runTransaction(async tx => {
        const snap = await tx.get(memberRef(uid));
        const cur = snap.exists ? snap.data() : {};
        const files = Array.isArray(cur.downloadedFiles) ? cur.downloadedFiles : [];
        const count = cur.downloadsUsed || 0;
        if (files.includes(path)) return count;
        if (count >= TRIAL_DOWNLOAD_LIMIT) {
          const when = access.trialEnd ? new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long" }).format(new Date(access.trialEnd)) : "the end of your trial";
          fail("resource-exhausted", `Your free trial includes ${TRIAL_DOWNLOAD_LIMIT} downloads and you have used them. More downloads open when your plan starts on ${when}.`);
        }
        tx.set(memberRef(uid), { downloadsUsed: count + 1, downloadedFiles: [...files, path].slice(-200), updatedAt: now() }, { merge: true });
        return count + 1;
      });
    }
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: now().getTime() + SIGNED_LINK_MINUTES * 60 * 1000,
      responseDisposition: `attachment; filename="${name}"`
    });
    return { url, downloadsUsed: used };
  }

  return { checkAccess, createCheckoutSession, claimSeat, createPortalSession, getDownloadLink };
}

module.exports = {
  build, describe, hashCode, cleanCode,
  STRIPE_API_VERSION, ORIGINS, LOCAL, ARMS, TRIAL_DAYS, TRIAL_DOWNLOAD_LIMIT, SEAT_KEY
};
