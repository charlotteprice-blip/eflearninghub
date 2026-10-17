"use strict";
// Executive Frame Learning Hub functions, region australia-southeast1. The rules are in core.js.
// The Stripe key comes from Secret Manager (STRIPE_SECRET_KEY); it is never in this repository.
// Test mode until launch: the secret holds a restricted test key (rk_test_...), then a live key at launch.

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { build, STRIPE_API_VERSION, ORIGINS, LOCAL } = require("./core");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const REGION = "australia-southeast1";

// Built once per instance.
let live = null;
function api() {
  if (!live) {
    const { initializeApp } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");
    const { getStorage } = require("firebase-admin/storage");
    const Stripe = require("stripe");
    initializeApp();
    live = build({
      stripe: new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 }),
      db: getFirestore(),
      bucket: getStorage().bucket(),
      now: () => new Date()
    });
  }
  return live;
}

const options = { region: REGION, secrets: [STRIPE_SECRET_KEY], cors: [...ORIGINS, LOCAL], maxInstances: 5, memory: "256MiB" };
const wrap = name => onCall(options, async request => {
  try {
    return await api()[name](request);
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    logger.error(`${name} failed`, { message: err && err.message, type: err && err.type, code: err && err.code });
    throw new HttpsError("internal", "Something went wrong.");
  }
});

exports.checkAccess = wrap("checkAccess");
exports.createCheckoutSession = wrap("createCheckoutSession");
exports.claimSeat = wrap("claimSeat");
exports.createPortalSession = wrap("createPortalSession");
exports.getDownloadLink = wrap("getDownloadLink");
