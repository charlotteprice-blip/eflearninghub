// Start (/start/): the 1 address the public website, Sarah's emails and the Client Hub send people to.
// Logged in with an active membership: straight on to the Learning Hub, or to ?next= (a same site path such as
// /hub/planning/). Logged in without one: the account or join page, and the Client Hub, offered side by side.
// Not logged in: 3 choices, the Client Hub, log in, or join (?arm=law carries through to Join).
// Who is a client is never read here and never appears in an address. The Client Hub keeps that to itself;
// the page only offers the Client Hub link to everyone alike.
import { firstUser, call, logOut, LOCAL, CLIENT_HUB } from "./app.js";
import { $, show, params, safeNext } from "./ui.js";
import { placeMark } from "./layout.js";

const VIEWS = ["v-loading", "v-choose", "v-member"];
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const NEXT = safeNext(params.get("next"));
const arm = (params.get("arm") || "").toLowerCase();
const ARM = /^[a-z0-9]{1,24}$/.test(arm) ? arm : "";
const back = new URLSearchParams();
if (ARM) back.set("arm", ARM);
if (NEXT !== "/") back.set("next", NEXT);
const SELF = "/start/" + (back.toString() ? "?" + back : "");
const JOIN = "/join/" + (ARM ? "?arm=" + ARM : "");

$("link-client").href = CLIENT_HUB;
$("link-login").href = "/login/?next=" + encodeURIComponent(SELF);
$("link-join").href = JOIN;
fetch("/content/plans.json").then(r => r.json()).then(p => {
  document.querySelectorAll("[data-trial-days]").forEach(el => { el.textContent = p.trialDays; });
}).catch(() => {});

$("btn-logout").addEventListener("click", async () => { await logOut(); location.assign(SELF); });

function member(email, access) {
  const ended = access && (access.hasBilling || access.state === "organisation-ended");
  $("member-text").textContent = `You are logged in as ${email}.`;
  $("member-note").textContent = access
    ? "This login does not have a Learning Hub membership at the moment. If you are a client of Executive Frame, the Client Hub is where your sessions and questionnaires are."
    : "Your Learning Hub membership could not be checked just now. The Client Hub is still open, or try again in a moment.";
  $("member-actions").innerHTML = (access
    ? (ended ? `<a class="btn btn-primary" href="/account/">Your account</a>` : `<a class="btn btn-primary" href="${esc(JOIN)}">Join the Learning Hub</a>`)
    : `<button class="btn btn-primary" type="button" data-reload>Try again</button>`)
    + `<a class="btn" href="${esc(CLIENT_HUB)}">Open the Client Hub</a>`;
  document.querySelectorAll("[data-reload]").forEach(b => b.addEventListener("click", () => location.reload()));
  show(VIEWS, "v-member", "member-title");
}

const user = await firstUser;
if (!user) {
  // Local preview: ?view=member shows the logged in view without an account.
  if (LOCAL && params.get("view") === "member") member("you@example.co.nz", { active: false, state: "none", hasBilling: false });
  else show(VIEWS, "v-choose", "choose-title");
} else {
  let access = null;
  try {
    access = await call("checkAccess");
  } catch (err) {
    console.warn("checkAccess failed", err && err.code);
  }
  if (access && access.active) location.replace(NEXT);
  else member(user.email || "", access);
}
