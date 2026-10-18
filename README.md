# Executive Frame Learning Hub

The self directed subscription app for Executive Frame at `app.executiveframe.co.nz`. Static HTML, CSS and vanilla JavaScript on Firebase (no framework, no build step), following the Themescape member app pattern. Developer and contact: Charlotte Price, hello@charlotteprice.co.nz. Work log: Notion, Executive Frame, App 1 (`docs/WORK-LOG.md` keeps a copy).

Members use a single desktop viewer, laid out like the Themescape viewer: a library sidebar with the account menu on the left, the current step in the middle, and the topic's notes, reflections and files on the right. Both sidebars fold away on a computer and become drawers on a phone.

The public website (executiveframe.co.nz, CloudCannon) is not touched by this repository. The Client Hub (`clients.executiveframe.co.nz`) is a separate repository and hosting site in the same Firebase project, sharing sign-in only, and it links into `/hub/<slug>/` pages here, so topic addresses never change.

## Membership process

Adapted from the Themescape member journey (Notion, Themescape, Membership Process):

1. **Join** (`/join/?arm=law`): "Has your organisation given you an access code?", then **create a login** with Google, Microsoft, or email and password, accepting the privacy statement.
2. A code is checked by **claimSeat**. Without a code, **checkAccess** looks for an organisation that owns the member's work email domain and offers its place (email confirmation required first). Otherwise the member **chooses monthly or annual** and **createCheckoutSession** opens Stripe Checkout: card collected, 7 day trial once per person, NZ$ with GST included.
3. **Thank you** confirms the trial or place, then the member opens the **viewer**, which checks membership with checkAccess (read from Stripe each time) behind a cover screen, as Themescape's viewer does.
4. **Account** shows the plan, trial end or renewal date and opens the Stripe portal (**createPortalSession**) to switch monthly and annual, update the card or cancel at period end. Organisation seat holders see their organisation and no billing controls.
5. **Log in** (`/login/`) with the same options and a password reset. **Log out and exit** is in the viewer's account menu, with an option to clear this browser's notes and progress on a shared computer, and on Account.

## Repository

```
firebase.json            Hosting (site "learning"), Functions (codebase "learning"), Firestore (default), Storage, emulators
firestore.rules          Members read their own document; nothing else readable; no browser writes
storage.rules            No browser access; downloads only through signed links
public/                  The site (Firebase Hosting)
  index.html             The members' viewer. /, /library/ and /hub/<slug>/ all open it (firebase.json rewrites)
  login/ join/ account/ thank-you/ privacy/   the account pages, one folder each, as in Themescape
  content/               arms.json, plans.json (display prices), topics.json, topics/<slug>.json
  assets/css/            tokens.css (every brand value), base.css, hub.css (step components), viewer.css (viewer layout)
  assets/js/             app.js (Firebase), viewer.js (viewer shell), player.js (topic steps), gate.js, layout.js, ui.js, one script per account page
  assets/brand/          Placeholder SVGs until the brand files arrive (see its README)
  assets/fonts/          Figtree 300, 400, 500, self hosted (OFL)
functions/               core.js (rules), index.js (Cloud Functions wiring), test/ (npm test)
scripts/                 stripe-setup, stripe-portal and stripe-check (Stripe by API), add-organisation (prepaid places), preview (local server)
docs/                    setup.md, content-format.md, WORK-LOG.md
tasks                    The terminal runner for every setup, test, deploy and admin task
```

## Terminal tasks

Every build, setup and admin step that can run in a terminal is a `./tasks` command. Run `./tasks help` for the list and `./tasks doctor` to check the tools. The setup order, and the few steps that have no command line route, are in `docs/setup.md`.

```
./tasks test        # function tests
./tasks preview     # local preview with sample content, no sign in
./tasks emulators   # full local run with the Firebase emulators
./tasks deploy      # tests, then deploys everything (asks first)
```
