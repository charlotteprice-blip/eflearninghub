# Executive Frame Learning Hub

The self directed subscription app for Executive Frame at `app.executiveframe.co.nz`. Static HTML, CSS and vanilla JavaScript on Firebase (no framework, no build step), following the Themescape member app pattern. Developer and contact: Charlotte Price, hello@charlotteprice.co.nz. Work log: Notion, Executive Frame, App 1 (`docs/WORK-LOG.md` keeps a copy).

Members use a single desktop viewer, laid out like the Themescape viewer: a library sidebar with the account menu on the left, the current step in the middle, and the topic's notes, reflections and files on the right. Both sidebars fold away on a computer and become drawers on a phone.

The public website (executiveframe.co.nz, CloudCannon) is not touched by this repository. The Client Hub (`clients.executiveframe.co.nz`, repository `efclienthub`) shares the Firebase project `ef-client-hub` for sign in only, so 1 login works in both apps. The Learning Hub has its own Firestore database (`learninghub`), Hosting site and Storage bucket (`executiveframe-learninghub`) and functions codebase (`learning`). The Client Hub links into `/hub/<slug>/` pages here, so topic addresses never change.

## Membership process

Adapted from the Themescape member journey (Notion, Themescape, Membership Process):

1. **Join** (`/join/?arm=law`): "Has your organisation given you an access code?", then **create a login** with Google, Microsoft, or email and password, accepting the privacy statement.
2. A code is checked by **claimSeat**. Without a code, **checkAccess** looks for an organisation that owns the member's work email domain and offers its place (email confirmation required first). Otherwise the member **chooses monthly or annual** and **createCheckoutSession** opens Stripe Checkout: card collected, 7 day trial once per person, NZ$ with GST included.
3. **Thank you** confirms the trial or place, then the member opens the **viewer**, which checks membership with checkAccess (read from Stripe each time) behind a cover screen, as Themescape's viewer does.
4. **Account** shows the plan, trial end or renewal date and opens the Stripe portal (**createPortalSession**) to switch monthly and annual, update the card or cancel at period end. Organisation seat holders see their organisation and no billing controls.
5. **Log in** (`/login/`) with the same options and a password reset. **Log out and exit** is in the viewer's account menu, with an option to clear this browser's notes and progress on a shared computer, and on Account.

## Repository

```
firebase.json            Hosting (target learning), Firestore (learninghub database), Storage (target learning),
                         Functions (codebase learning), Content Security Policy, emulators
.firebaserc              Project ef-client-hub; targets point at executiveframe-learninghub
firestore.rules          Members read their own record; nothing else readable; no browser writes
storage.rules            No browser access; downloads only through signed links
public/                  The site (Firebase Hosting)
  index.html             The members' viewer. /, /library/ and /hub/<slug>/ all open it
  login/ join/ account/ thank-you/ privacy/   the account pages, one folder each, as in Themescape
  content/               arms.json, plans.json (display prices), topics.json, topics/<slug>.json
  assets/css/            tokens.css (every brand value), base.css, hub.css, viewer.css
  assets/js/             firebase-config.js (written by npm run setup), app.js, viewer.js, player.js, gate.js,
                         layout.js, ui.js, one script per account page
  assets/vendor/firebase Firebase SDK, self hosted (npm run vendor)
  assets/fonts/          Figtree 300, 400, 500, Latin and Latin Extended, self hosted (OFL)
  assets/brand/          Placeholder SVGs until the brand files arrive (see its README)
functions/               core.js (rules), index.js (Cloud Functions wiring), test/ (unit tests)
scripts/                 setup.mjs, tasks.mjs, stripe.mjs (+ stripe-setup, stripe-portal, stripe-check), orgs.mjs,
                         upload.mjs, serve.mjs, vendor.mjs, check-contrast.mjs, worklog.mjs
tests/rules.test.js      Security rules tests in the emulators
docs/                    firebase-setup.md, content-format.md, WORK-LOG.md
```

## Terminal tasks

The same process as the Client Hub: every build, setup and admin step is an `npm run` command. `npm run tasks` lists them all. The full setup, in order, is in `docs/firebase-setup.md`.

```
npm install
npm run setup:check     what exists and what is missing in Firebase; changes nothing
npm run setup           creates each missing piece, asking first
npm run check           function tests and colour contrast
npm run serve           local preview with sample content, no sign in
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

## Placeholders still to confirm

Prices (NZ$XX), the trial download allowance (5), the partner rate amount, the privacy statement wording and contact email, the brand SVGs, the workshop video, and all sample topic content.
