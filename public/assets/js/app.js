// Executive Frame Learning Hub: the single place the pages connect to Firebase.
// Every Firebase module comes from /assets/vendor/firebase (copied there by npm run vendor), so nothing loads from
// outside Firebase Hosting. Settings are in firebase-config.js, written by npm run setup.
// On localhost the pages use the Firebase emulators on the demo project demo-learninghub (npm run emulators).
// Browsers never write to Firestore: every change goes through a Cloud Function (see functions/core.js).

import { initializeApp } from "/assets/vendor/firebase/firebase-app.js";
import { getAuth, connectAuthEmulator, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "/assets/vendor/firebase/firebase-auth.js";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "/assets/vendor/firebase/firebase-functions.js";
import { firebaseConfig, FUNCTIONS_REGION } from "./firebase-config.js";

export const REGION = FUNCTIONS_REGION;
export const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

export const app = initializeApp(
  LOCAL ? { ...firebaseConfig, apiKey: "demo-key", projectId: "demo-learninghub", authDomain: location.host } : firebaseConfig
);
export const auth = getAuth(app);
auth.languageCode = "en";
const functions = getFunctions(app, REGION);

if (LOCAL) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
await setPersistence(auth, browserLocalPersistence);

// The first auth state, then null or the user. Pages wait on this before deciding what to show.
export const firstUser = new Promise(resolve => {
  const stop = onAuthStateChanged(auth, user => { stop(); resolve(user); });
});
export const onUser = cb => onAuthStateChanged(auth, cb);
export const logOut = () => signOut(auth);

// Callable functions. Errors keep their code and readable message, so pages can show what went wrong.
export async function call(name, data) {
  const res = await httpsCallable(functions, name)(data || {});
  return res.data;
}

// Messages from the functions are written for members; anything technical becomes a plain sentence.
export function explainCallError(err, fallback) {
  const code = err && typeof err.code === "string" ? err.code.replace(/^functions\//, "") : "";
  if (code && !["internal", "unknown", "unavailable", "deadline-exceeded"].includes(code) && err.message) return err.message;
  return fallback || "Something went wrong. Please try again in a moment.";
}

// Firebase Authentication errors in plain language.
const AUTH_MESSAGES = {
  "auth/email-already-in-use": "An account already uses this email address.",
  "auth/invalid-email": "Please enter a full email address, such as name@example.co.nz.",
  "auth/invalid-credential": "That email address and password do not match an account.",
  "auth/wrong-password": "That email address and password do not match an account.",
  "auth/user-not-found": "That email address and password do not match an account.",
  "auth/weak-password": "Please choose a password of at least 10 characters, with a number and a symbol such as ! ? # @ or %.",
  "auth/missing-password": "Please enter your password.",
  "auth/password-does-not-meet-requirements": "Please choose a password of at least 10 characters, with a number and a symbol such as ! ? # @ or %.",
  "auth/too-many-requests": "There have been too many attempts. Please wait a few minutes and try again.",
  "auth/popup-blocked": "Your browser blocked the sign in window. Allow pop ups for this page and try again.",
  "auth/operation-not-allowed": "This way of signing in is not available yet. Please use another option.",
  "auth/account-exists-with-different-credential": "This email address already has an account that uses a different way of signing in. Please use that option instead.",
  "auth/network-request-failed": "The Learning Hub could not be reached. Check your internet connection and try again.",
  "auth/unauthorized-domain": "Signing in is not set up for this web address yet."
};
export const QUIET_AUTH = ["auth/popup-closed-by-user", "auth/cancelled-popup-request", "auth/user-cancelled"];
export const explainAuthError = err => AUTH_MESSAGES[err && err.code] || "Something went wrong. Please try again.";

// Password rule, matching the Firebase password policy to be set in the console:
// at least 10 characters, with a number and a symbol.
const PW_SYMBOL = /[\^$*.\[\]{}()?"!@#%&\/\\,><':;|_~`]/;
export function passwordProblem(pw) {
  if (pw.length < 10) return "Please use at least 10 characters.";
  if (!/[0-9]/.test(pw)) return "Please include a number.";
  if (!PW_SYMBOL.test(pw)) return "Please include a symbol such as ! ? # @ or %. A hyphen or plus sign does not count.";
  return "";
}

// Version of the privacy statement members agree to, recorded with their consent.
export const PRIVACY_VERSION = "2026-10-18-draft";
