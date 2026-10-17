# Work log

A copy of the entries in Notion (Executive Frame, App 1). Newest first.

## Session 1, 18 October 2026

**Built.** All 6 deliverables in the brief's order. (1) Repository tree, `firebase.json`, `firestore.rules`, `storage.rules`. (2) `tokens.css` holding every brand kit value, self hosted Figtree, and a shared header and footer with the mark drawing on over 1200ms. (3) `/login/` and `/join/` with Firebase Auth (Google, Microsoft, email and password, password reset, email confirmation), following the Themescape membership process. (4) `/library/` and the `/hub/{slug}/` template driven by one JSON file per topic, with a sample Autonomy topic using the rotating C³ Loop triangle, a drag and drop sort, a reflection box, a workshop step and a download step. (5) The 5 Cloud Functions in Stripe test mode, with 11 unit tests. (6) `/account/` and `/thank-you/`, plus a draft privacy statement, a 404 page, and two admin scripts (Stripe products and prices; organisations with hashed access codes).

**Checked.** Unit tests pass (checkout, trial once per person, arm and partner prices, seats by code and by domain, verification, full and expired organisations, trial download limit, origin check). Pages exercised in Chromium at 390px and 1280px with no horizontal scroll. Join, account, log out and log in run end to end against the Auth emulator.

**Stubbed or placeholder.** Brand SVGs (placeholder mark drawn to the kit's description). Prices shown as NZ$XX. Trial download allowance set to 5. Partner rate amount. Privacy statement wording and contact email. Sample topic content, workshop video and workbook PDF. The Notion to JSON export script is not written.

**Decisions and why.**
1. Functions copy the Themescape structure (`build({stripe, db, bucket, now})`, origin allowlist, pinned Stripe API version, one trial per person) so the two apps can be maintained the same way, and so the rules are testable without Firebase.
2. Prices are found by Stripe lookup key. An arm gets its own price only if `library_<arm>_monthly` exists, so Sarah's choice between one library price and a price per arm needs no code change. `ACCESS_BY_ARM` in `core.js` limits topics by arm if she chooses separate arms.
3. The brief's `isClient` field is implemented as `pricingTier: "partner"`, with the Stripe prices named "Partner rate". Being a client of a psychologist is health information under the Health Information Privacy Code 2020, so the Learning Hub records only a neutral pricing tier and never the reason. Easily reversed if Sarah prefers the original.
4. Privacy consent (version and time) is recorded by `createCheckoutSession` and `claimSeat`, keeping to 5 functions.
5. Email confirmation is required for every organisation place, by code or by domain, as the brief states.
6. Firebase web settings load from Hosting's `/__/firebase/init.json`, so no project settings sit in the repository.
7. Figtree is self hosted, so no browser request goes to Google Fonts and the privacy statement stays accurate.
8. Topic progress, sort answers and reflections are kept in the learner's browser only. No learner writing reaches a server.
9. Workshop videos load only when the learner presses play.
10. Firestore rules cover the (default) database only. The Client Hub should use a named database so neither app's deploy can change the other's rules.
11. Checkout returns to `/thank-you/` (the brief) rather than `/library` (September plan); cancelling returns to `/join/`.
12. `AUTOMATIC_TAX` is off until Executive Frame's GST registration is confirmed and entered in Stripe Tax.
13. The repository is `eflearninghub`, as created by Charlotte, rather than `executive-frame-app`.

**Charlotte to configure.** Full checklist in `docs/console-setup.md`. Firebase: create the project under Sarah's account on Blaze; Firestore and Storage in australia-southeast1; enable Google, Microsoft (Entra app registration) and Email/Password with the 10 character policy; authorised domain; `STRIPE_SECRET_KEY` secret (restricted test key); Service Account Token Creator role for signed links; custom domain at launch. Stripe: Administrator invite; restricted key; run `scripts/stripe-setup.mjs` once amounts are confirmed; customer portal (cancel at period end, card update, monthly and annual switching); receipt, trial ending and failed payment emails; branding; Stripe Tax if registered.

**Open questions.**
1. Prices, and one library price or a price per arm.
2. Trial download allowance (5 assumed) and whether trial members download at all.
3. Partner rate amount, and whether the Client Hub or Charlotte sets `pricingTier`.
4. GST registration, which decides automatic tax.
5. Topic JSON is publicly readable by address even though the pages are members only; only PDFs are fully protected. Decide whether hub content must be fully gated (would serve JSON through a function or Storage).
6. No Stripe webhook was in the brief. Without one, an organisation's `seatsUsed` is not reduced when a seat holder leaves, and checkAccess reads Stripe on every page load. Recommend adding one.
7. Signing in on the Client Hub does not sign the person in here (sessions are per address). Decide whether a handoff is needed.
8. Contact email for the privacy statement, and Sarah's approval of its wording.
9. Microsoft accounts sometimes arrive unconfirmed in Firebase, which would ask law firm staff to confirm their email before a domain place is given. Test with a partner firm account.
10. Notion database structure and the export script for topic content.
