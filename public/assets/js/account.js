// Account: membership status from checkAccess, billing through the Stripe customer portal (createPortalSession).
// Organisation seat holders see their organisation and no billing controls.
import { auth, firstUser, call, explainCallError, logOut, LOCAL } from "./app.js";
import { $, show, say, nzDate } from "./ui.js";
import { placeMark } from "./layout.js";
import { sendEmailVerification } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const VIEWS = ["v-loading", "v-account", "v-error"];
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const user = await firstUser;
if (!user) {
  location.replace("/login/?next=" + encodeURIComponent("/account/"));
  await new Promise(() => {});
}

const PROVIDERS = { "google.com": "Google", "microsoft.com": "Microsoft", password: "Email and password" };
$("acc-email").textContent = user.email || "";
$("acc-provider").textContent = user.providerData.map(p => PROVIDERS[p.providerId] || p.providerId).join(", ") || "Email and password";
$("acc-verified").textContent = user.emailVerified ? "Yes" : "Not yet";
$("btn-verify").hidden = user.emailVerified;
$("btn-verify").addEventListener("click", async () => {
  try {
    await sendEmailVerification(auth.currentUser);
    say("verify-msg", "A confirmation link is on its way. Check your inbox, and your junk folder.", true);
  } catch (err) {
    say("verify-msg", "The link could not be sent just now. Please try again in a few minutes.");
  }
});
$("btn-logout").addEventListener("click", async () => { await logOut(); location.assign("/login/?signedout=1"); });

let access;
try {
  access = await call("checkAccess");
} catch (err) {
  console.warn("checkAccess failed", err && err.code);
  if (LOCAL) access = { active: false, state: "none", hasBilling: false };
  else { show(VIEWS, "v-error", "error-title"); throw err; }
}

const row = (k, v) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
const btn = (label, href, primary) => `<a class="btn${primary ? " btn-primary" : ""}" href="${href}">${esc(label)}</a>`;
const billingButton = `<button id="btn-billing" class="btn" type="button">Manage billing</button>`;
const PLAN = { monthly: "Monthly", annual: "Annual" };
let summary = "", rows = "", actions = "";

switch (access.state) {
  case "trialing":
    summary = `Your free trial runs until ${nzDate(access.trialEnd)}.`;
    rows = row("Plan", `${PLAN[access.interval] || "Library"}, starting after your trial`)
      + (access.cancelAtPeriodEnd ? row("Ends", nzDate(access.trialEnd)) : row("First payment", nzDate(access.trialEnd)))
      + (access.downloadLimit ? row("Trial downloads", `${access.downloadsUsed || 0} of ${access.downloadLimit} used`) : "");
    actions = btn("Open the Learning Hub", "/", true) + billingButton;
    break;
  case "active":
    summary = access.cancelAtPeriodEnd ? `Your plan is cancelled and access continues until ${nzDate(access.periodEnd)}.` : "Your membership is active.";
    rows = row("Plan", PLAN[access.interval] || "Library")
      + row(access.cancelAtPeriodEnd ? "Access ends" : "Renews", nzDate(access.periodEnd));
    actions = btn("Open the Learning Hub", "/", true) + billingButton;
    break;
  case "past_due":
    summary = "Your last payment did not go through. Please update your card in billing to keep your access.";
    rows = row("Plan", PLAN[access.interval] || "Library");
    actions = billingButton.replace('class="btn"', 'class="btn btn-primary"') + btn("Open the Learning Hub", "/");
    break;
  case "organisation":
    summary = `Your place is provided by ${access.organisation.name}. There is nothing to pay.`;
    rows = row("Organisation", access.organisation.name) + row("Access until", nzDate(access.organisation.contractEnd));
    actions = btn("Open the Learning Hub", "/", true);
    break;
  case "organisation-ended":
    summary = `Access through ${access.organisation ? access.organisation.name : "your organisation"} has ended. You can join for yourself, or ask your organisation about renewing.`;
    actions = btn("Join for myself", "/join/", true);
    break;
  case "ended":
    summary = `Your plan ended${access.periodEnd ? " on " + nzDate(access.periodEnd) : ""}. You can rejoin at any time.`;
    actions = btn("Rejoin", "/join/", true) + (access.hasBilling ? billingButton : "");
    break;
  default:
    summary = "You do not have a membership yet.";
    actions = btn("Join the library", "/join/", true);
}

$("membership-summary").textContent = summary;
$("membership-rows").innerHTML = rows;
$("membership-rows").hidden = !rows;
$("membership-actions").innerHTML = actions;
$("billing-note").hidden = !$("btn-billing");

const billing = $("btn-billing");
if (billing) billing.addEventListener("click", async () => {
  say("billing-msg", "");
  billing.disabled = true;
  $("loading-text").textContent = "Opening billing";
  show(VIEWS, "v-loading");
  try {
    const { url } = await call("createPortalSession");
    location.assign(url);
  } catch (err) {
    billing.disabled = false;
    show(VIEWS, "v-account");
    say("billing-msg", explainCallError(err, "Billing could not be opened just now. Please try again in a moment."));
  }
});

show(VIEWS, "v-account");
