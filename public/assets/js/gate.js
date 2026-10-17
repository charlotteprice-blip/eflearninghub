// Members only pages (Library, topic hubs): signed in and an active membership, read from checkAccess.
// checkAccess reads the subscription in Stripe on every call, as Themescape's membership function does,
// so the page never trusts anything stored in the browser.
// Local preview: on localhost with no emulators running, the page opens with sample content and a banner.

import { firstUser, call, LOCAL } from "./app.js";
import { session } from "./ui.js";

const here = () => location.pathname + location.search;

export async function requireMember() {
  const user = await firstUser;
  if (!user) {
    if (LOCAL && (await emulatorsDown())) return preview();
    location.replace("/login/?next=" + encodeURIComponent(here()));
    return new Promise(() => {});
  }
  try {
    const access = await call("checkAccess");
    if (access.active) {
      session.set("ef-access", JSON.stringify({ at: Date.now(), access }));
      return { user, access };
    }
    location.replace("/join/?from=" + encodeURIComponent(here()));
    return new Promise(() => {});
  } catch (err) {
    if (LOCAL) return preview();
    throw err;
  }
}

async function emulatorsDown() {
  try {
    await fetch("http://127.0.0.1:9099/", { mode: "no-cors", cache: "no-store" });
    return false;
  } catch (e) {
    return true;
  }
}

function preview() {
  const bar = document.createElement("p");
  bar.className = "preview-banner";
  bar.setAttribute("role", "note");
  bar.textContent = "Local preview: membership is not checked and downloads are switched off.";
  document.body.prepend(bar);
  return { user: null, access: { active: true, preview: true, state: "preview" } };
}
