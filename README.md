# Executive Frame Learning Hub

The self directed subscription app for Executive Frame at `learn.executiveframe.co.nz`. Static HTML, CSS and vanilla JavaScript on Firebase (no framework, no build step), following the Themescape member app pattern. Developer and contact: Charlotte Price, hello@charlotteprice.co.nz. Work log: Notion, Executive Frame, App 1 (`docs/WORK-LOG.md` keeps a copy).

Members use a single desktop viewer, laid out like the Themescape viewer: a library sidebar with the account menu on the left, the current step in the middle, and the topic's notes, reflections and files on the right. Both sidebars fold away on a computer and become drawers on a phone.

The public website (executiveframe.co.nz, CloudCannon) is not touched by this repository. The Client Hub (`clients.executiveframe.co.nz`, repository `efclienthub`) shares the Firebase project `ef-client-hub` for sign in only, so 1 login works in both apps. The Learning Hub has its own Firestore database (`learninghub`), Hosting site and Storage bucket (`executiveframe-learninghub`) and functions codebase (`learning`). The Client Hub links into `/hub/<slug>/` pages here, so topic addresses never change.

## Membership process

Adapted from the Themescape member journey (Notion, Themescape, Membership Process):

0. **Start** (`/start/`): the 1 address the public website, Sarah's emails and the Client Hub send people to. A member who is logged in goes straight to the viewer (or to `?next=/hub/<slug>/`). Someone logged in without a membership is sent straight to the Client Hub if the Client Hub's own function `hasClientHub` says their login has a place there; otherwise they see their account or join page and the Client Hub link side by side. Everyone else chooses: I am a client (the Client Hub), I am a member (log in), or I am new here (join, with `?arm=` carried through). Who is a client is never read from a database here and never appears in an address: the Client Hub answers only the person's own browser, about themselves.
1. **Join** (`/join/?arm=law`): "Has your organisation given you an access code?", then **create a login** with email and password, accepting the privacy statement.
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
brand/ef-tokens.json     The brand pack's token file, unchanged: the single source for colours, spacing, radius, motion
                         and the mark's geometry. npm run tokens writes it into tokens.css and the inline mark
public/                  The site (Firebase Hosting)
  index.html             The members' viewer. /, /library/ and /hub/<slug>/ all open it
  start/ login/ join/ account/ thank-you/ privacy/   the account pages, one folder each, as in Themescape
  content/               arms.json, plans.json (display prices), programmes.json, courses.json, lessons/<slug>.json
  assets/css/            tokens.css (every brand value), base.css, hub.css, viewer.css
  assets/js/             firebase-config.js (written by npm run setup), app.js (Firebase and the Client Hub address),
                         viewer.js, player.js, gate.js, layout.js, ui.js, one script per account page
  assets/vendor/firebase Firebase SDK, self hosted (npm run vendor)
  assets/fonts/          Figtree 300, 400, 500, Latin and Latin Extended, self hosted (OFL)
  assets/brand/          Placeholder SVGs until the brand files arrive (see its README)
functions/               core.js (rules), index.js (Cloud Functions wiring), test/ (unit tests)
scripts/                 setup.mjs, tasks.mjs, stripe.mjs (+ stripe-setup, stripe-portal, stripe-check), orgs.mjs,
                         upload.mjs, serve.mjs, vendor.mjs, check-contrast.mjs, worklog.mjs
tests/rules.test.js      Security rules tests in the emulators
docs/                    firebase-setup.md, content-format.md, WORK-LOG.md
```

## Content from Notion

Lessons and resource cards come live from Sarah's Notion workspace: a scheduled function (`syncContent`) reads it every 15 minutes with a read only key and the viewer asks `getContent` for the result, so publishing needs no deploy. Only rows and pages Sarah marks Published are read in. `docs/notion-sync.md` has the design, the columns Sarah adds and how a lesson page is written. `npm run content -- check` shows what would be published and what is wrong, and changes nothing. Programmes and courses stay as files in `public/content`.

## Components guide

`docs/design-system/components.html` shows every component of the Learning Hub and the Client Hub as each app draws it today, side by side, in every state, with the differences to settle listed at the end. It is 1 file that opens from disk. `npm run guide` rebuilds it from both apps' CSS (it needs `~/efclienthub` beside this folder) and from the samples in `docs/design-system/components.src.html`. The 10 November 2026 audit it was built from is in `docs/audits/`.

## Links from the website and emails

Every button on executiveframe.co.nz and every link in an email points at `/start/`, so the website never needs to know who is logged in or who is a client:

| Button or link | Address |
| --- | --- |
| Open my hub, I am a client, Launch my hub, Get started | `https://learn.executiveframe.co.nz/start/` |
| Get started from an arm's page or email (preselects that arm's prices on Join) | `/start/?arm=neurodiversity` (any slug in `public/content/arms.json`) |
| Open a lesson (the Client Hub's results links) | `/start/?next=/hub/<slug>/` or the lesson address itself, `/hub/<slug>/` |

Until DNS is connected the host is `https://executiveframe-learninghub.web.app`. The Client Hub address the start page links to is `CLIENT_HUB` in `public/assets/js/app.js`.

## Terminal tasks

The same process as the Client Hub: every build, setup and admin step is an `npm run` command. `npm run tasks` lists them all. The full setup, in order, is in `docs/firebase-setup.md`.

```
npm install
npm run setup:check     what exists and what is missing in Firebase; changes nothing
npm run setup           creates each missing piece, asking first
npm run tokens          write the brand pack values into tokens.css (after a new brand pack)
npm run check           function tests, tokens up to date, colour contrast
npm run serve           local preview with sample content, no sign in
npm run content -- check   what Notion would publish, and what is wrong; changes nothing
npm run deploy:rules
npm run deploy:functions
npm run deploy:hosting
```

## Placeholders still to confirm

The annual price (NZ$XX; the monthly price shown is NZ$29, confirmed 11 November 2026, as wording only: no Stripe price exists yet), the trial download allowance (5), the partner rate amount, the privacy statement wording (the contact email is consultant@sarahanticich.co.nz), the brand SVGs, the workshop video, and all sample topic content.
