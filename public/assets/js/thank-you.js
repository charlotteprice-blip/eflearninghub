// Thank you: after Stripe Checkout (?session_id=...) or after claiming an organisation place (?seat=1).
// Checkout has finished before Stripe sends the member here, so the subscription normally exists already;
// checkAccess is tried a few times in case Stripe is a moment behind.
import { firstUser, call, LOCAL } from "./app.js";
import { $, show, params, nzDate } from "./ui.js";
import { placeMark } from "./layout.js";

document.querySelectorAll("[data-reload]").forEach(b => b.addEventListener("click", () => location.reload()));
const VIEWS = ["v-loading", "v-done", "v-wait"];
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });

const user = await firstUser;
if (!user && !LOCAL) {
  location.replace("/login/?next=" + encodeURIComponent("/"));
  await new Promise(() => {});
}

const pause = ms => new Promise(r => setTimeout(r, ms));
let access = null;
for (let i = 0; i < 6 && user; i++) {
  try {
    access = await call("checkAccess");
    if (access.active) break;
  } catch (err) { console.warn("checkAccess failed", err && err.code); }
  await pause(1500);
}

if (!access || !access.active) {
  if (LOCAL && !user) {
    $("done-detail").textContent = "Local preview: no membership was checked.";
    show(VIEWS, "v-done", "done-title");
  } else {
    show(VIEWS, "v-wait", "wait-title");
  }
} else {
  if (access.state === "organisation") {
    $("done-text").textContent = `Your place is provided by ${access.organisation.name}.`;
    $("done-detail").textContent = `Access runs until ${nzDate(access.organisation.contractEnd)}. There is nothing to pay.`;
  } else if (access.state === "trialing") {
    $("done-text").textContent = "Your free trial has started.";
    $("done-detail").textContent = `It runs until ${nzDate(access.trialEnd)}. You can cancel from your account page before then without being charged.`;
  } else {
    $("done-text").textContent = "Your membership is active.";
  }
  show(VIEWS, "v-done", "done-title");
}
