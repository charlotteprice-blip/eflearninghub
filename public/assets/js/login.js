// Log in: Google, Microsoft, or email and password, then on to the page the member was going to (default Library).
import { auth, firstUser, explainAuthError, QUIET_AUTH } from "./app.js";
import { $, show, say, busy, clearErrors, fieldError, liveClear, params, safeNext } from "./ui.js";
import { placeMark } from "./layout.js";
import {
  signInWithPopup, signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, OAuthProvider
} from "/assets/vendor/firebase/firebase-auth.js";

const VIEWS = ["v-login", "v-reset", "v-busy"];
const NEXT = safeNext(params.get("next"));
const BUTTONS = ["btn-google", "btn-microsoft", "btn-login"];
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });

if (params.get("email")) $("email").value = params.get("email");
if (params.has("signedout")) say("login-msg", "You have logged out.", true);

const user = await firstUser;
if (user) location.replace(NEXT);

function done() {
  $("busy-text").textContent = "Signing you in";
  show(VIEWS, "v-busy");
  location.replace(NEXT);
}

const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });
const microsoft = new OAuthProvider("microsoft.com");
microsoft.setCustomParameters({ prompt: "select_account" });

async function withProvider(provider) {
  clearErrors();
  say("login-msg", "");
  busy(BUTTONS, true);
  try {
    await signInWithPopup(auth, provider);
    done();
  } catch (err) {
    if (!QUIET_AUTH.includes(err && err.code)) say("login-msg", explainAuthError(err));
  } finally {
    busy(BUTTONS, false);
  }
}
$("btn-google").addEventListener("click", () => withProvider(google));
$("btn-microsoft").addEventListener("click", () => withProvider(microsoft));

liveClear($("form-login"));
$("form-login").addEventListener("submit", async e => {
  e.preventDefault();
  clearErrors();
  say("login-msg", "");
  const email = $("email").value.trim(), password = $("password").value;
  if (!email) { fieldError("email", "Please enter your email address."); return; }
  if (!password) { fieldError("password", "Please enter your password."); return; }
  busy(BUTTONS, true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    done();
  } catch (err) {
    say("login-msg", explainAuthError(err));
    if (err && err.code === "auth/invalid-email") fieldError("email", null);
  } finally {
    busy(BUTTONS, false);
  }
});

$("btn-show").addEventListener("click", () => {
  const p = $("password");
  const showing = p.type === "text";
  p.type = showing ? "password" : "text";
  $("btn-show").textContent = showing ? "Show" : "Hide";
  $("btn-show").setAttribute("aria-label", showing ? "Show password" : "Hide password");
  $("btn-show").setAttribute("aria-pressed", String(!showing));
});

$("btn-forgot").addEventListener("click", () => {
  $("reset-email").value = $("email").value.trim();
  say("reset-msg", "");
  show(VIEWS, "v-reset", "reset-title");
});
$("btn-back").addEventListener("click", () => show(VIEWS, "v-login", "login-title"));

$("form-reset").addEventListener("submit", async e => {
  e.preventDefault();
  clearErrors();
  const email = $("reset-email").value.trim();
  if (!email) { fieldError("reset-email", "Please enter your email address."); return; }
  busy(["btn-reset"], true);
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    // The same reply whether or not the address has an account, so the form cannot be used to test addresses.
    if (err && err.code === "auth/invalid-email") { fieldError("reset-email", "Please enter a full email address."); busy(["btn-reset"], false); return; }
  }
  busy(["btn-reset"], false);
  say("reset-msg", "If that address has an account, a reset link is on its way. Check your inbox, and your junk folder.", true);
});
