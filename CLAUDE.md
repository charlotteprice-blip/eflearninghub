# Executive Frame Learning Hub: working notes for Claude

This repo is the Executive Frame Learning Hub (App 1), the self directed subscription learning app for Sarah Anticich's practice. Charlotte Price (hello@charlotteprice.co.nz) builds and runs it. It will live at learn.executiveframe.co.nz; until DNS is connected it is https://executiveframe-learninghub.web.app. The repo is at ~/eflearninghub and pushes to github.com/charlotteprice-blip/eflearninghub on `main`. Read README.md, docs/firebase-setup.md, docs/content-format.md, docs/notion-sync.md and docs/WORK-LOG.md before changing anything substantial.

## Stack

Static HTML, CSS and vanilla JavaScript on Firebase, with Stripe for billing. No framework and no build step. The Firebase SDK is self hosted in public/assets/vendor/firebase (refresh with `npm run vendor`); Figtree is self hosted in public/assets/fonts. Nothing loads from a CDN, and the Content Security Policy in firebase.json enforces that.

## Shared Firebase project: touch only the Learning Hub's parts

The app shares the Firebase project `ef-client-hub` with the Client Hub (repo `efclienthub`, ~/efclienthub), so 1 login works in both apps. The Learning Hub owns only:

| Part | Learning Hub (ours) | Client Hub (never touch) |
| --- | --- | --- |
| Firestore database | `learninghub` | `clienthub` |
| Hosting site | `executiveframe-learninghub` | `executiveframe-clienthub` |
| Storage bucket | `executiveframe-learninghub` | `executiveframe-clienthub` |
| Functions codebase | `learning` | `clienthub` |
| Region | `australia-southeast1` | |

1. Every deploy names its targets. Use the npm scripts (`deploy:rules`, `deploy:functions`, `deploy:hosting`, `deploy`), which pass `--only hosting:learning`, `storage:learning`, `functions:learning` and the `learninghub` database. Never run a bare `firebase deploy`.
2. Never read, change or delete any `clienthub` resource, and never change a project wide setting that would alter the Client Hub, unless Charlotte asks for that exact change. The password policy step (`npm run setup -- --only=passwordpolicy`) is one of these: it changes sign up for the Client Hub too, so it only runs when Charlotte names it.

## Stripe

1. Stripe work happens only in Sarah's Executive Frame Stripe account, never the Charlotte Price Consulting account. If a key, dashboard or customer looks like it belongs to Charlotte Price Consulting, stop and ask.
2. Live key since 10 November 2026. On Charlotte's instruction the functions use a restricted live key (`rk_live_...`) from the Executive Frame account (`executive-frame-products`), saved as `STRIPE_SECRET_KEY`. Payments are still closed: no Learning Hub prices exist in live mode, so Checkout answers that a price is missing. Never create prices, and never pass `--live` to `npm run stripe`, until Charlotte gives the amounts and says to open payments.
3. Prices are found by lookup key (see the comment at the top of functions/core.js), so test and live use the same code.

## Privacy

1. Members store `pricingTier: "partner"` for the discounted rate, never a field, label, price name or log line that implies the person is a client of Sarah's. Being a psychologist's client is health information under the Health Information Privacy Code 2020.
2. Learner progress, notes, reflections and sort answers stay in the browser's localStorage only. Never send them to a function, Firestore, analytics or a log.
3. Browsers never write to Firestore; every change goes through a Cloud Function.

## Content from Notion

Lessons and resource cards sync from Sarah's Notion workspace every 15 minutes (`docs/notion-sync.md`). The rules that never bend:

1. Only rows and pages Sarah marks Published are read in. Never widen the sync to the whole catalogue: it holds internal, referrer and clinical material and rows naming organisations.
2. The catalogue's Description, prices and Drive links are never stored or shown; members read the Hub summary.
3. The Notion key is read only, lives in Secret Manager as `NOTION_TOKEN` (`npm run secret:notion`) and is typed at a hidden prompt.
4. A live slug never changes, and a broken edit keeps the last good version.

## Terminal tasks

1. Every task Charlotte might repeat is an npm script. If a new repeatable step appears, add a script to package.json and a line to scripts/tasks.mjs rather than giving her a one off command. `npm run tasks` lists them all.
2. When a step needs Charlotte to type a secret (Stripe key, Notion token, OAuth secret) or answer prompts, do not run it. Give her the exact command to run in this window with `!` in front, for example `! npm run setup -- --only=database`, and wait for her to say it is done. Secrets are read at a hidden prompt, never from chat, files or shell history.
3. Login steps (`npx firebase login`, `gcloud auth login` and similar) open a browser, so give them to Charlotte with `!` as well.

## Writing and copy

UK English, no em dashes or en dashes, no testimonials, and digits for numbers. This applies to page copy, lesson content, docs, commit messages and the work log. Topic text is plain text with no HTML or Markdown (docs/content-format.md).

## Replies to Charlotte

Short, plain language, bullet points. UK English, no emojis, no em dashes, digits for numbers.

## After each working session

1. Add a row to the Notion Worklog database (`collection://4e19e919-9261-4378-b538-4d6630923ad0`, under the App 1 page `3fc776b1803080bbad19dfdcd34b80fa`) with:
   - Entry: `Session N — title` (N follows the last session in docs/WORK-LOG.md; this is the database's own title format)
   - Date, Session number, Commit (the short hash of the last commit)
   - Body sections: What was built, Files changed, Checked, Decisions and why, Charlotte to configure, Open questions
2. Add the same entry to docs/WORK-LOG.md, newest first, and commit it.
3. `npm run worklog` prints the day's commits as a starting point. Without a Notion connection, give Charlotte the text to paste.

## Live site and DNS

Any change to DNS for executiveframe.co.nz, or to the live executiveframe.co.nz website (CloudCannon, not in this repo), must also be logged in the Site Changes Log. This repo never edits the public website itself.

## Working loop

1. Make the change and keep README.md and the docs in step with it.
2. `npm run check` (function unit tests and colour contrast). `npm run test:rules` needs Java 21 for the emulators.
3. Look at it with `npm run serve`, then http://127.0.0.1:5055/ (sample content, no sign in).
4. Commit with a plain message and push.
5. Deploy only the parts that changed, with the npm deploy scripts.
6. Write the work log entry above.
