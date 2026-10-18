// Join: the Themescape membership process, adapted.
// 1. Access code question (organisation code, or joining for myself).
// 2. Create a login (Google, Microsoft, or email and password) and accept the privacy statement.
// 3. A code is claimed (claimSeat); otherwise a matching work email domain is offered, otherwise a plan is chosen
//    and Stripe Checkout opens (createCheckoutSession). One free trial per person, card collected.
// ?arm=law (or any slug in /content/arms.json) preselects that arm's prices; unknown values are ignored.

import { auth, firstUser, call, explainCallError, explainAuthError, QUIET_AUTH, passwordProblem, PRIVACY_VERSION } from "./app.js";
import { $, show, say, busy, clearErrors, fieldError, liveClear, params, session } from "./ui.js";
import { placeMark } from "./layout.js";
import {
  signInWithPopup, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut,
  GoogleAuthProvider, OAuthProvider
} from "/assets/vendor/firebase/firebase-auth.js";

const VIEWS = ["v-loading", "v-code", "v-signup", "v-signed", "v-org", "v-plan", "v-have"];
const STEP = { "v-code": 1, "v-signup": 2, "v-signed": 2, "v-org": 3, "v-plan": 3 };
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });

function go(view, focusId) {
  show(VIEWS, view, focusId);
  const n = STEP[view];
  $("dots").hidden = !n;
  document.querySelectorAll("[data-dot]").forEach(d => {
    if (Number(d.dataset.dot) === n) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current");
  });
}
function loading(text) { $("loading-text").textContent = text; go("v-loading"); }

const cleanCode = v => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const [armsData, plansData] = await Promise.all([
  fetch("/content/arms.json").then(r => r.json()),
  fetch("/content/plans.json").then(r => r.json())
]);
const requested = (params.get("arm") || "").toLowerCase();
const arm = armsData.arms.find(a => a.slug === requested) || null;
document.querySelectorAll("[data-arm-name]").forEach(el => { el.textContent = arm ? arm.name : "Executive Frame"; });
document.querySelectorAll("[data-trial-days]").forEach(el => { el.textContent = plansData.trialDays; });
if (arm) $("link-login").href = "/login/?next=" + encodeURIComponent("/join/?arm=" + arm.slug);

// The plan cards, from /content/plans.json. Placeholder prices are marked until confirmed.
$("plan-choices").innerHTML = plansData.plans.map((p, i) => `
  <label class="choice">
    <input type="radio" name="interval" value="${p.interval}" ${i === 0 ? "checked" : ""}>
    <span class="choice-body">
      <span class="choice-title">${p.label}</span>
      <span class="choice-price"><span class="${plansData.placeholder ? "placeholder" : ""}">${p.price}</span> <span class="t-ui">${p.per}</span></span>
      <span class="choice-note">${p.note}</span>
    </span>
  </label>`).join("");

let code = "";
let privacyOk = session.get("ef-privacy") === PRIVACY_VERSION;

// ---- Step 1: access code ----
$("form-code").addEventListener("change", e => {
  if (e.target.name !== "has-code") return;
  $("code-field").hidden = e.target.value !== "yes";
  if (e.target.value === "yes") $("code").focus();
});
liveClear($("form-code"));
$("form-code").addEventListener("submit", e => {
  e.preventDefault();
  clearErrors();
  say("code-msg", "");
  const choice = document.querySelector("input[name=has-code]:checked");
  if (!choice) { say("code-msg", "Please choose an answer."); $("code-no").focus(); return; }
  code = choice.value === "yes" ? cleanCode($("code").value) : "";
  if (choice.value === "yes" && code.length < 6) { fieldError("code", "Please enter the code your organisation sent you."); return; }
  afterStep1();
});

async function afterStep1() {
  const user = auth.currentUser;
  if (!user) { go("v-signup", "signup-title"); return; }
  $("signed-email").textContent = user.email || "";
  $("privacy2").checked = privacyOk;
  go("v-signed", "signed-title");
}

// ---- Step 2: login ----
const SIGNUP_BUTTONS = ["btn-google", "btn-microsoft", "btn-create"];
function needPrivacy(box, msgId) {
  if ($(box).checked) { privacyOk = true; session.set("ef-privacy", PRIVACY_VERSION); return true; }
  say(msgId, "Please tick the privacy statement to continue.");
  $(box).focus();
  return false;
}
const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });
const microsoft = new OAuthProvider("microsoft.com");
microsoft.setCustomParameters({ prompt: "select_account" });

async function withProvider(provider) {
  clearErrors();
  say("signup-msg", "");
  if (!needPrivacy("privacy", "signup-msg")) return;
  busy(SIGNUP_BUTTONS, true);
  try {
    await signInWithPopup(auth, provider);
    await afterLogin();
  } catch (err) {
    if (!QUIET_AUTH.includes(err && err.code)) say("signup-msg", explainAuthError(err));
  } finally {
    busy(SIGNUP_BUTTONS, false);
  }
}
$("btn-google").addEventListener("click", () => withProvider(google));
$("btn-microsoft").addEventListener("click", () => withProvider(microsoft));

liveClear($("form-signup"));
$("form-signup").addEventListener("submit", async e => {
  e.preventDefault();
  clearErrors();
  say("signup-msg", "");
  const name = $("name").value.trim(), email = $("email").value.trim(), password = $("password").value;
  if (!email) { fieldError("email", "Please enter your email address."); return; }
  const pw = passwordProblem(password);
  if (pw) { fieldError("password", pw); return; }
  if (!needPrivacy("privacy", "signup-msg")) return;
  busy(SIGNUP_BUTTONS, true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name.slice(0, 120) });
    try { await sendEmailVerification(cred.user); } catch (err) { console.warn("Verification email not sent", err && err.code); }
    await afterLogin();
  } catch (err) {
    say("signup-msg", explainAuthError(err));
    if (err && (err.code === "auth/email-already-in-use" || err.code === "auth/account-exists-with-different-credential")) {
      const a = document.createElement("a");
      const back = "/join/" + (arm ? "?arm=" + arm.slug : "");
      a.href = "/login/?email=" + encodeURIComponent(email) + "&next=" + encodeURIComponent(back);
      a.textContent = "Log in instead";
      $("signup-msg").append(" ", a);
      fieldError("email", null, false);
    }
  } finally {
    busy(SIGNUP_BUTTONS, false);
  }
});
$("btn-signup-back").addEventListener("click", () => go("v-code", "code-title"));
$("btn-show").addEventListener("click", () => {
  const p = $("password");
  const showing = p.type === "text";
  p.type = showing ? "password" : "text";
  $("btn-show").textContent = showing ? "Show" : "Hide";
  $("btn-show").setAttribute("aria-pressed", String(!showing));
  $("btn-show").setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

$("btn-signed-next").addEventListener("click", () => {
  say("signed-msg", "");
  if (needPrivacy("privacy2", "signed-msg")) afterLogin();
});
$("btn-switch").addEventListener("click", async () => {
  await signOut(auth);
  go("v-signup", "signup-title");
});

// ---- Step 3: code, organisation domain, or plan ----
async function afterLogin() {
  if (code) return claim({ code });
  loading("Checking your access");
  let access;
  try {
    access = await call("checkAccess");
  } catch (err) {
    console.warn("checkAccess failed", err && err.code);
    access = { active: false };
  }
  if (access.active) return haveAccess(access);
  if (access.organisationOffer) {
    $("org-name").textContent = access.organisationOffer.name;
    $("org-verify").hidden = true;
    go("v-org", "org-title");
    return;
  }
  $("trial-note").hidden = access.trialAvailable === false;
  go("v-plan", "plan-title");
}

function haveAccess(access) {
  $("have-text").textContent = access.organisation
    ? `Your place is provided by ${access.organisation.name}.`
    : "Your membership is active.";
  go("v-have", "have-title");
}

async function claim(data) {
  loading(data.code ? "Checking your code" : "Setting up your place");
  try {
    await call("claimSeat", { ...data, privacyVersion: PRIVACY_VERSION });
    location.replace("/thank-you/?seat=1");
  } catch (err) {
    const reason = (err && err.details && err.details.reason) || "";
    if (reason === "verify-email") {
      // Email verification comes before any organisation place, by code or by domain.
      $("org-verify-email").textContent = auth.currentUser ? auth.currentUser.email : "";
      $("org-verify").hidden = false;
      $("btn-org").textContent = "Continue";
      go("v-org", "org-title");
      return;
    }
    if (data.code) {
      say("code-msg", explainCallError(err, "Your code could not be checked just now. Please try again in a moment."));
      $("code-yes").checked = true;
      $("code-field").hidden = false;
      go("v-code", "code");
      return;
    }
    say("org-msg", explainCallError(err));
    go("v-org", "org-title");
  }
}
$("btn-org").addEventListener("click", async () => {
  say("org-msg", "");
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await user.reload();
    await user.getIdToken(true);
    if (!auth.currentUser.emailVerified) {
      say("org-msg", "Your email address is not confirmed yet. Open the link we sent, then press Continue.");
      return;
    }
  }
  claim(code ? { code } : {});
});
$("btn-resend").addEventListener("click", async () => {
  try {
    await sendEmailVerification(auth.currentUser);
    say("org-msg", "A new link is on its way.", true);
  } catch (err) {
    say("org-msg", explainAuthError(err));
  }
});
$("btn-org-skip").addEventListener("click", () => go("v-plan", "plan-title"));

$("form-plan").addEventListener("submit", async e => {
  e.preventDefault();
  say("plan-msg", "");
  const interval = (document.querySelector("input[name=interval]:checked") || {}).value;
  if (!interval) { say("plan-msg", "Please choose a plan."); return; }
  busy(["btn-checkout"], true);
  loading("Opening secure payment");
  try {
    const { url } = await call("createCheckoutSession", { arm: arm ? arm.slug : null, interval, privacyVersion: PRIVACY_VERSION });
    location.assign(url);
  } catch (err) {
    busy(["btn-checkout"], false);
    say("plan-msg", explainCallError(err, "Secure payment could not be opened just now. Please try again in a moment."));
    go("v-plan", "plan-title");
  }
});

// ---- Start ----
const user = await firstUser;
if (params.has("cancelled")) say("code-msg", "Payment was not completed, so nothing was charged. You can choose again whenever you are ready.", true);
if (user) {
  loading("Checking your access");
  try {
    const access = await call("checkAccess");
    if (access.active) { haveAccess(access); }
    else if (params.has("cancelled") && privacyOk) { afterLogin(); }
    else go("v-code", "code-title");
  } catch (err) {
    go("v-code", "code-title");
  }
} else {
  go("v-code");
}
