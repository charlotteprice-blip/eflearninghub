"use strict";
// Executive Frame Learning Hub functions (codebase "learning"), project ef-client-hub, region australia-southeast1.
// The rules are in core.js.
// The Stripe key comes from Secret Manager (STRIPE_SECRET_KEY); it is never in this repository.
// Since 10 November 2026 the secret holds a restricted live key (rk_live_...) from the Executive Frame account.
// Payments stay closed until the prices are created in live mode (npm run stripe -- prices --live).

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { build, STRIPE_API_VERSION, ORIGINS, LOCAL } = require("./core");
const { notionClient, runSync, readBundle, NOTION } = require("./sync");

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const REGION = "australia-southeast1";
// The Learning Hub shares the ef-client-hub project with the Client Hub (one login for both apps) but keeps its own
// Firestore database and Storage bucket, so neither app can read or change the other's records.
const DATABASE = "learninghub";
const BUCKET = "executiveframe-learninghub";

// Built once per instance.
let database = null;
function db() {
  if (!database) {
    const { initializeApp } = require("firebase-admin/app");
    const { getFirestore } = require("firebase-admin/firestore");
    initializeApp();
    database = getFirestore(DATABASE);
  }
  return database;
}
let live = null;
function api() {
  if (!live) {
    const store = db();
    const { getStorage } = require("firebase-admin/storage");
    const Stripe = require("stripe");
    live = build({
      stripe: new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: STRIPE_API_VERSION, maxNetworkRetries: 2 }),
      db: store,
      bucket: getStorage().bucket(BUCKET),
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

// ---------- Content from Sarah's Notion (sync.js; the rules are in content.js; docs/notion-sync.md) ----------
// The Notion key is read only and can see only the databases Sarah has shared with it. It comes from Secret
// Manager (NOTION_TOKEN, set with npm run secret:notion) and is never in this repository.

// Every 15 minutes: read what is Published in Notion and store it in the learninghub database.
// Firebase asks for every secret the codebase declares before it deploys anything, even when only 1 function is
// named. So the Notion key is declared, and the schedule exists, only once NOTION.scheduled is true (sync.js).
// Until then the other functions deploy with the Stripe key alone.
if (NOTION.scheduled) {
  const NOTION_TOKEN = defineSecret("NOTION_TOKEN");
  exports.syncContent = onSchedule(
    { schedule: "every 15 minutes", timeZone: "Pacific/Auckland", region: REGION, secrets: [NOTION_TOKEN], maxInstances: 1, retryCount: 0, timeoutSeconds: 540, memory: "256MiB" },
    async () => {
      const report = await runSync({ notion: notionClient(NOTION_TOKEN.value()), db: db(), now: () => new Date() });
      const L = report.lessons, R = report.resources;
      // Counts only: no titles, text or names in the log.
      logger.info("syncContent", {
        resources: R.published, resourceProblems: R.problems.length, resourcesError: R.error,
        lessons: L.published, updated: L.updated.length, removed: L.removed.length, lessonProblems: L.problems.length, lessonsError: L.error
      });
    }
  );
}

// The published lessons and resource cards, for the viewer. Any logged in person may ask; membership is checked
// by checkAccess before the viewer opens, as it is for the content files in public/content.
let bundle = null;
exports.getContent = onCall({ region: REGION, cors: [...ORIGINS, LOCAL], maxInstances: 5, memory: "256MiB" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Please log in.");
  try {
    if (!bundle || Date.now() - bundle.at > 60 * 1000) bundle = { at: Date.now(), value: await readBundle(db()) };
    return bundle.value;
  } catch (err) {
    logger.error("getContent failed", { message: err && err.message, code: err && err.code });
    throw new HttpsError("internal", "Something went wrong.");
  }
});
