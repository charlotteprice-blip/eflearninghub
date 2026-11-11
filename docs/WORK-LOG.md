# Work log

A copy of the entries in Notion (Executive Frame, App 1). Newest first.

## Session 15, 12 November 2026

Commit `0f58478` on main.

**Built.** Brand pack 1.1 and the brand designer's review, applied to both hubs from 1 shared list of decisions. Levi Wilson agreed with the Client Hub as the base and asked for these changes: buttons are pills again in both apps; the supplied mark, lockup, favicons and app icons replace the placeholders, with Learning Hub beside the lockup as plain text after a hairline; colours come from the pack's token file, kept in the repo as `brand/ef-tokens.json` and written into `tokens.css` by `npm run tokens`; status and notice colours are the pack's application colours; a notice is 1 component with an icon and a word (Note, Done, Attention, Problem); status pills carry an icon and a word, and Not started is the neutral tag; nothing has a shadow, the sort step's drag ghost included; the mark draws on once per visit and never pulses. The library search has a visible label, the Centre in 90 seconds tool button sits on 1 line, step buttons are 44 px, and the Back and Next bar has a flat fill. `npm run check` now also fails on a stale token file, any shadow, or a colour written into a rule. In the Client Hub the same decisions were applied, the journey ring was retired for a step tracker, and the formulation drawings use tokens only. Both hubs were deployed and the live files match their repos.

**Files changed.** New: `brand/ef-tokens.json`, `scripts/tokens.mjs`, the favicon and icon files at the site root, the pack's logo files in `public/assets/brand/`, `docs/audits/brand-pack-1.1-learning-hub.md`. Changed: all 4 CSS files, `layout.js`, `ui.js`, `viewer.js`, `player.js`, all 8 pages (head snippet), `scripts/check-contrast.mjs`, `scripts/serve.mjs`, `scripts/tasks.mjs`, `package.json`.

**Checked.** Function tests (27) and 34 contrast pairs pass, with no shadows and no colour in a rule. The whole 11 November test pass was rerun on the branch in a headless browser at 375, 768 and 1440 px with 0 issues, and Home and Log in were looked at in the preview before the merge. Both apps were built in separate working copies so the main folders stayed safe to deploy, then merged, pushed and deployed (pages only). Live: every script, style, content and icon file on both sites matches its repo. Client Hub: 164 unit tests, 89 rules tests and 58 contrast pairs pass. Not done: the favicon as a real browser tab draws it, the home screen icon, real phones, Safari and Firefox, a real login.

**Decisions and why.**
1. Pills, reversing the 12 px corners adopted on 10 November: the guidelines and the public website use pill buttons, so a button should not change shape when someone signs in.
2. The primary button stays navy though the pack's tokens say slate. Levi is changing the pack to navy; the override is 1 named constant in `scripts/tokens.mjs`.
3. The pack's application colours replace the status colours chosen on 10 November, so there is 1 set for both apps and the brand.
4. Body text stays at 400; Levi is updating the guidelines to match.
5. No dark mode in this release, though the guidelines show one. Assumed, to be confirmed with Charlotte.
6. On a phone the viewer header shows the app name as text and no logo: the lockup with its clear space does not fit beside the 2 header buttons at 375 px.
7. The macron problem Levi saw (Whangārei shown with a question mark) was the email attachment, not the guide or the apps: the copy he received had every non ASCII character replaced, and the file on disk is correct.

**Charlotte to configure.** Test both live hubs. Reply to Levi with the open points. Send Sarah the note on the Client Hub changes, which are live.

**Open questions.** For Levi: the quiet ink colour against "no muted text colour"; the 6 px progress bar against "thin hairline"; captions at 400; centred loading screens; navy `theme-color` above a sky page; whether the lesson's loop diagram sits too close to the mark. For Charlotte and Levi: the Client Hub's client type colours against "no colour per pathway"; both hubs install as "Executive Frame"; dark mode. For Sarah: Return as a 4th stage; "the arm you joined through" in the privacy statement, where the guidelines say pathway; Home in the Client Hub without the ring.

## Session 14, 11 November 2026

Commit `532708c` on main.

**Built.** Charlotte's 3 late decisions and a full test pass, so both hubs are ready for her to test. A finished lesson still opens on its last step and now offers Start from the beginning; the wording is Join the Learning Hub everywhere; the privacy address is confirmed as `consultant@sarahanticich.co.nz`. The test pass found and fixed 2 defects: the password reset form said a link was on its way when the Learning Hub could not be reached, and a logged in member's page header wrapped every label onto 2 lines on a phone. A test guide, `docs/testing/test-guide-2026-11-12.md`, gives the preview command and 25 numbered steps for the live site. The fix log now reads 20 fixed, 1 already fixed, 5 partly and 1 left. In the Client Hub, the review branch was merged into `main` at Charlotte's instruction, then: the journey never moves back, Home hides its empty Resources panel, 2 defects from its own test pass were fixed, and it has its own 25 step test guide. Its fix log reads 27 fixed, 5 partly, 3 left.

**Files changed.** Learning Hub: `public/assets/js/` (`player.js`, `viewer.js`, `join.js`, `login.js`, `account.js`, `layout.js`), `public/assets/css/base.css`, the join and account pages, `docs/audits/fixes-learning-hub-2026-11-11.md`, `docs/testing/test-guide-2026-11-12.md`, `docs/design-system/components.html` (rebuilt). Client Hub: 3 commits on its `main`.

**Checked.** Function tests (27) and every contrast pair pass. The test pass ran in a headless browser at 375, 768 and 1440 px: every page and state, including 8 membership states on Account and every join step and error, all 3 lessons to Finish with every scenario option tried, the viewer settings all switched on, and 1 whole lesson by keyboard only. Signed in states were reached by standing in for the sign in module inside the test browser; no account was created and no function was called. The pages were deployed from this session at about 10.40 pm on 11 November, and all 54 live files then matched the repo by hash; the public pages answer 200 and the 6 Learning Hub functions and `hasClientHub` answer. Client Hub: 150 unit tests, 89 rules tests and 35 contrast pairs pass, walked in its harness as client, practitioner and admin. Not done: a real login, real membership states, Stripe Checkout, downloads, real touch, real screen readers, Safari and Firefox. The Client Hub's new functions, pages and rules are not live: this session was not permitted to run that deploy.

**Decisions and why.**
1. A finished lesson opens on its summary with a restart button (Charlotte), so a learner lands on what they took away and can still go round again.
2. Join the Learning Hub, not the library (Charlotte). The join heading no longer names the arm a link came from; the arm is still carried through to Stripe.
3. On a phone, a logged in member's header shows the mark without the wordmark, so the 3 links fit on 1 line.
4. The Client Hub was merged to `main` before its last test pass, at Charlotte's instruction, so `main` is what she tests.
5. The Client Hub deploy stays with Charlotte, in a fixed order: functions, then pages, then rules. Rules first would leave clients with no questionnaires.

**Charlotte to configure.**
- Test the live Learning Hub with her own login, following the test guide.
- Deploy the Client Hub in order: `npm run deploy:functions`, `npm run deploy:hosting`, `npm run deploy:rules`, from `~/efclienthub`. Or try it first with `npm run harness`.
- Send Sarah the note about what changes on her side before she next logs in.
- Stripe prices, once the amounts are confirmed. Until then Checkout says secure payment could not be opened.

**Open questions.** Whether the arm should show on the join page in another form; "You are signed in" or "logged in" on join and account; a partner rate member sees NZ$29; grey example text in fields is a little under the contrast minimum in both hubs; the Larger text setting. Client Hub: a questionnaire completed twice shows twice in Results with no date; the 4 decisions that are Sarah's; the questionnaire with the doubtful answer scale.

## Session 13, 10 and 11 November 2026

Commit `9241e53` on main (the last of the session's app commits; the first is `5484d43`).

**Built.** (1) The Learning Hub's look brought into line with the Client Hub's, as both audits recommended: a sky frame around a warm white reading sheet, 12 px filled buttons, body text at 400 with the lighter weight as a setting, warm white fields, edged notices, no shadows, status pills for progress. (2) 19 of the audit's 27 findings fixed, 5 partly, 1 closed by the alignment and 2 left for a decision; the record is `docs/audits/fixes-learning-hub-2026-11-11.md`. The Back and Next bar no longer covers lesson text, quiet text is a solid colour that passes contrast, hidden columns leave the tab order, a failed membership check says so with Try again, and load failures, payment problems and saved writing are all said on the page. (3) `getContent` is for members only: it reads access from Stripe as `checkAccess` does. (4) The contact email is `consultant@sarahanticich.co.nz` and the join page shows NZ$29 a month; annual and partner amounts stay marked as placeholders. (5) The components guide was sent to Levi Wilson for review as it stood before the alignment (kept as `components-before-alignment-2026-11-10.html`), then its notes were brought in line: 15 things still different between the apps, 21 settled. (6) In the Client Hub, on the branch `audit-fixes-2026-11-10` and not merged: 25 of 35 findings fixed, 6 partly, 4 left, plus Charlotte's 5 decisions (confirmation before releasing a formulation, idle log out at 30 minutes, no client names or emails for admin, scoring rules closed to clients, the contact email). Its record is in that repo.

**Files changed.** Learning Hub: `public/assets/css/` (all 4 files), `public/assets/js/` (`viewer.js`, `player.js`, `join.js`, `login.js`, `layout.js`, `gate.js`, `settings-early.js`), `public/index.html` and the start, join, login and account pages, `public/content/plans.json`, `functions/index.js`, `scripts/check-contrast.mjs`, `docs/notion-sync.md`, `docs/design-system/` (guide, source, the snapshot), `docs/audits/fixes-learning-hub-2026-11-11.md`. Client Hub: 15 commits on its branch only.

**Checked.** Function tests (27) and every contrast pair pass, with new pairs for the status colours and the quiet ink. The alignment was looked at in the preview: Home, 3 lessons, the settings dialog, the account menu, join, login with an error, and Home with the drawer at phone width. The fixes were checked in a headless browser at 1440, 768, 375 and 320 px, walking all 3 sample lessons to the end with an answer chosen on every scenario. Live: all 6 Learning Hub functions and the Client Hub's `hasClientHub` answer; the live pages match the folder as deployed at 9.02 pm on 11 November. Client Hub branch: 146 unit tests, 89 rules tests and 35 contrast pairs pass, checked in its local harness as client, practitioner and admin. Not done: real touch, real screen readers, Safari and Firefox, the sort, workshop and download steps, and the live path through `getContent` with a real member. The last 7 Learning Hub fixes are pushed but not deployed.

**Decisions and why.**
1. The Client Hub's look is the base, because it has a written design system. Kept from the Learning Hub: buttons as wide as their label, the pressed state, the 3 column viewer, the settings dialog and the segmented control.
2. A lesson is read straight on the warm white sheet, not inside a tinted card, so its sky pieces (a situation, a notice, a plan) stand out.
3. Lessons are locked to members at the server (Charlotte, 11 November). It costs about 1 second when the viewer opens.
4. NZ$29 a month is shown before the price exists in Stripe (Charlotte). Checkout still answers that a price is missing, so nobody can be charged.
5. The Client Hub fixes stay on a branch until Charlotte has reviewed them (her choice), because it is the clinical app.
6. An idle log out never sends anything on a client's behalf. An unsent formulation comment is let go, not sent to the practitioner and not kept in the browser.
7. A deploy sends the folder, not the commits. Both hubs were deployed with work in progress in the folder. Nothing harmful went out (4 working Learning Hub edits; 1 additive Client Hub function), and the fix runs were then told to commit each fix as soon as it is checked. The Client Hub folder is back on `main`.

**Charlotte to configure.**
- `npm run deploy:hosting` for the last 7 Learning Hub fixes.
- Review the Client Hub branch before it is merged. When it is deployed the order matters: functions, then pages, then rules.
- Stripe prices, once the monthly, annual and partner amounts are confirmed.
- Still waiting on Sarah: Notion workspace owner access, the 5 Learning Hub decisions, the 11 website answers. On Levi: his review of the guide, and the supplied brand mark files.

**Open questions.** Learning Hub: whether a finished lesson reopens at step 1; whether `consultant@sarahanticich.co.nz` is right for privacy requests; Join the library or Join the Learning Hub; what the Larger text setting should do in both hubs; grey example text in fields sits a little under the contrast minimum in both hubs. Client Hub: the questionnaire with the doubtful answer scale; the consent wording, which may want lines on admin access and idle log out; whether a later questionnaire moves the journey back; clinical terms on the client's formulation; an urgent help line for a client whose answer is flagged; older history entries in the live database that still hold client names.

## Session 12, 10 November 2026

Commit `9889d85` on main.

**Built.** 4 things after the Notion sync. (1) An impeccable audit of both hubs, run as 2 child sessions that changed no code. The Learning Hub scored 13 of 20 with 27 findings (0 P0, 8 P1); the Client Hub scored 13 of 20 with 35 findings (0 P0, 12 P1). Each report also compares the 2 apps and lists every component. (2) A shared components guide, `docs/design-system/components.html`: every component of both apps as each draws it today, side by side, in every state, with a switch for either app alone, 11 sections and a table of 22 differences to settle. `npm run guide` rebuilds it from both apps' CSS. (3) The scheduled Notion sync now sits behind a switch, `NOTION.scheduled` in `functions/sync.js`, off until the Notion key is saved, so the other functions deploy with the Stripe key alone. (4) The Stripe key is live: on Charlotte's instruction a restricted live key from the Executive Frame account (`executive-frame-products`) is saved as `STRIPE_SECRET_KEY`. No prices exist in live mode, so payments are closed.

**Files changed.** New: `docs/design-system/components.html` (generated), `docs/design-system/components.src.html` (the samples), `scripts/components-guide.mjs`, `docs/audits/impeccable-learning-hub-2026-11-10.md`. Changed: `functions/index.js` and `functions/sync.js` (the switch), `functions/core.js`, `scripts/setup.mjs`, `package.json` (`guide`), `scripts/tasks.mjs`, `README.md`, `CLAUDE.md` (Stripe rule 2), `docs/firebase-setup.md`, `docs/notion-sync.md`. The Client Hub's audit is in its own repo at `docs/audits/impeccable-client-hub-2026-11-10.md`, uncommitted there.

**Checked.** Function tests (27) and contrast (14 pairings) pass. The guide: built twice with the same result; the skill's checker reports all contents links and variables resolved, no outside loads, 452 KB, and 1 note (the loop's "new" state has no rule, which is the app's own design); in the browser at 1024 px all 81 samples drew with their own app's styles (pill buttons at weight 300 for the Learning Hub, 12 px buttons at weight 400 for the Client Hub), the 3 switcher settings showed 42 and 39, 42 and 0, 0 and 39 samples, no console errors and no sideways scroll. Live checks: both sites serve their pages; the shared login settings list both apps' addresses; the Client Hub's functions answer; all 6 Learning Hub functions return not found, so a person can log in there but the viewer stays on its cover screen. With the switch off the functions declare 1 secret, `STRIPE_SECRET_KEY`. Not done: the Learning Hub functions are not deployed (this session was not permitted to run the deploy), the guide was not checked at phone width by me, and the Client Hub was not rendered for the guide (its markup came from its source).

**Decisions and why.**
1. Audit first, change nothing. Charlotte asked for findings, and both apps had work in flight.
2. The guide shows each app as it is, not a merged design. Both audits recommend the Client Hub's look as the base, because it has a written design system; which version each component takes is Charlotte's call, and the guide's last table is the list to decide from.
3. Each sample sits in a shadow root with its own app's CSS, because the 2 apps reuse class names (`.btn`, `.panel`, `.notice`) with different rules. Forced states are generated from the apps' own hover, active and focus rules, so the guide cannot drift from them.
4. Client Hub samples use placeholders only, with no client data or health information, real or invented.
5. A switch for the scheduled sync, because Firebase asks for every secret a codebase declares before deploying anything, even with `--only`, and saves whatever is typed at that prompt in a dry run too. The `deploy:functions:members` script from earlier in the day did not avoid this and is removed.
6. Live Stripe key with prices held back. Charlotte chose to skip test mode. Logging in can work without opening payments, since Checkout needs prices that do not exist yet.

**Charlotte to configure.**
- `npm run deploy:functions`, so logging in gets past the cover screen. It should ask for no key.
- Then `npm run deploy:hosting` here and `npm run deploy:functions` in `~/efclienthub`, for the start page change from session 10.
- Read the differences table at the end of the components guide and choose a version for each row.
- Still waiting on Sarah: Notion workspace owner access, the 5 Learning Hub decisions, the 11 answers for the website's terms and privacy pages.

**Open questions.** Which app's version each shared component takes, starting with buttons, body weight, surface colours and fields. From the Client Hub audit, for Charlotte or Sarah: flagged answers do not reach the dashboard; an admin account cannot open a questionnaire page; releasing a formulation has no confirmation or undo; the consent notice omits Splose data, formulation responses and retention; admins can see client names and emails; there is no idle sign out; 1 cleared questionnaire may have the wrong answer scale. From the Learning Hub audit: the contact email, prices and privacy statement are still placeholders a member can see. Whether the Learning Hub prices should be created in the same Stripe account as the website's workbook sales.

## Session 11, 10 November 2026

Commit `cf887a1` on main.

**Built.** Stage D, changed from a manual Notion export to a live connection, at Charlotte's request: the Learning Hub now updates as Sarah adds to her catalogue. A scheduled function, `syncContent`, reads Sarah's Notion workspace every 15 minutes with a read only key and stores what she has marked Published in the `learninghub` database (`content/state` and `contentLessons/<slug>`). A callable, `getContent`, hands it to the viewer, so publishing needs no deploy. There are 2 sources. The catalogue (389 rows of products and files, read from a CSV export Charlotte supplied) feeds resource cards, shown in a new Resources section on Home that opens a page on executiveframe.co.nz or downloads a library file. A separate lessons database, 1 page per lesson written step by step under headings such as `Text: Why the body comes first`, feeds lessons; all 12 step types can be written that way. Until a source has synced, and in the local preview, the files in `public/content` stand in, including a new sample `resources.json`. `npm run content -- check` reads Notion and prints what would be published and what is wrong, changing nothing; `sync` runs it now; `status` prints the last report. `npm run secret:notion` saves the key. Also: a status check of the website and both apps, the missing session 10 entry, and a draft email and Claude prompt for Sarah's 5 open decisions.

**Files changed.** New: `functions/content.js` (the rules), `functions/sync.js` (the Notion client and the run), `functions/test/content.test.js`, `scripts/content.mjs`, `public/content/resources.json`, `docs/notion-sync.md`. Changed: `functions/index.js` (`syncContent`, `getContent`, 1 shared database handle), `public/assets/js/viewer.js` (live content with fallback, Resources section), `player.js` (`downloadFile` shared with Home), `hub.css`, `package.json`, `scripts/tasks.mjs`, `scripts/setup.mjs` (Cloud Scheduler API), `README.md`, `CLAUDE.md`, `docs/content-format.md`, `docs/redesign-plan.md`, `docs/firebase-setup.md`.

**Checked.** Function tests (27, of which 16 are new) and contrast (14 pairings) pass. The new tests cover every step type, the plain language problems for a broken page, the catalogue rules, and the run: unchanged pages are skipped, a broken edit keeps the last good lesson, unpublishing removes it, a slug cannot change, 2 pages cannot share a slug, a Notion failure changes nothing, and a dry run writes nothing. `functions/index.js` loads and registers both new functions in australia-southeast1. In the local preview: Home shows Resources with 2 sample cards, Open points at the website in a new tab, Download gives the preview message, and a lesson still opens at step 1 of 10; no console errors beyond the expected emulator check. Not done: nothing has run against the real Notion workspace, the viewer's live path (lessons and cards from `getContent`) has not been exercised in a browser, and nothing is deployed.

**Decisions and why.**
1. A publish gate, not the whole catalogue. Only 9 of 389 rows are tagged Subscriber app; the rest include internal, referrer and clinical material and rows naming organisations. Sarah marks a row Published to show it.
2. Members read a new Hub summary column. The catalogue's Description holds internal review notes, so it is never stored or shown, and neither are prices or Drive links.
3. Categories that say who a file was written for (patient, client, referrer) are shown as Handout or Resource.
4. The catalogue cannot produce lessons, because a row is a title and a link to a file. Lessons get their own Notion database, read by the same key.
5. Lessons are written in the page body under typed headings, not as a database row per step, because that is closest to how Sarah and her Claude already write.
6. Programmes and courses stay as files in the repository. They change rarely and decide the library's shape; a course shows once it has a published lesson.
7. A scheduled read every 15 minutes, not Notion webhooks: 1 moving part, no public endpoint, and a 15 minute wait is acceptable.
8. Safe failure throughout: a broken edit keeps the last good version, a live slug cannot change, and an unreachable Notion changes nothing.
9. `getContent` needs a login but does not check Stripe, matching the content files, which are public today. Tightening both to members only is a separate decision.
10. The key is created in Sarah's workspace, read only, shared with the 2 databases only. This also removes the problem that Charlotte's Notion connection cannot see Sarah's workspace.

**Charlotte to configure.**
- Notion (needs workspace owner in Sarah's workspace): create the internal integration, read only, and share the catalogue with it (`docs/notion-sync.md`, section 1).
- Ask Sarah to add 3 catalogue columns (Learning Hub status, Slug, Hub summary) and mark 1 or 2 rows Published.
- Then `npm run content -- check` until the report is clean.
- To go live: `npx firebase login --reauth`, `npm run setup -- --only=apis`, `npm run secret:notion`, `npm run deploy:functions` (also needs the Stripe key set), `npm run deploy:hosting`, `npm run content -- sync`.
- Later: Sarah creates the Hub Lessons database; its id goes in `NOTION.lessonsDb` in `functions/sync.js`.
- Still open from session 10: the start page deploy in both repos.

**Open questions.** For Sarah, from the catalogue: S.H.I.F.T. is Stop, Hold, Focus, Take Action in the catalogue, with an Identify step flagged elsewhere; the 4th beat is Repeat in the catalogue and Return in the app; the catalogue has 14 arms and the app 9; the catalogue shows 1 Elite arm; 1 row plans the Learning Hub on LearnWorlds and another mentions Thinkific; the membership is listed at NZ$29 a month while the app shows NZ$XX. For Charlotte: whether content should be members only at the server (decision 9); whether files should copy from Drive to the library automatically; who tells Sarah when a published row is left out.

## Session 10, 10 November 2026

Commit `1e75a1c` on main.

**Built.** The start page now routes a logged in client automatically. After `checkAccess` says there is no Learning Hub membership, `start.js` calls the Client Hub's new function `hasClientHub` (codebase `clienthub`, same project and region, so the existing Content Security Policy already allows it) and sends a client straight to the Client Hub. If the call fails or answers false, the page falls back to the join or account view with the Client Hub link beside it, as before. A member who is also a client still lands in the Learning Hub first. The Client Hub side was built in its own session (efclienthub commit `48b0c1a`, decision 60 there): the function answers only the signed in person's own browser, true for an open client record or a staff claim, and logs no one.

**Files changed.** `public/assets/js/start.js`, `README.md` (membership process step 0).

**Checked.** Function tests (11) and contrast (14 pairings) pass. Both start page views render in the local preview with no console errors. The logged in path cannot be exercised locally and was not exercised live: the Firebase CLI login on the Mac had expired, so neither `deploy:hosting` here nor `deploy:functions` in efclienthub has run yet. The live `start.js` was checked later the same day and does not yet hold the change.

**Decisions and why.**
1. The signal lives in the Client Hub, not here. The Learning Hub never reads the `clienthub` database; the Client Hub answers from its own records, to the person's own browser, about themselves, and the answer is not stored or logged (Health Information Privacy Code 2020).
2. Membership wins over client status. A person with an active Learning Hub membership goes to the library even if they are also a client, because the start page lives on the Learning Hub and the Client Hub is 1 link away.
3. The function call failing is not an error for the person: the page simply shows the choice it showed before.

**Charlotte to configure.**
- `npx firebase login --reauth`, then `npm run deploy:hosting` here and `npm run deploy:functions` in `~/efclienthub`, so the start page and `hasClientHub` go live together. Then try the start page logged in as a test client and as a member.
- As session 6: website buttons to `/start/`, `CLIENT_HUB` at launch, the Stripe key, DNS.

**Open questions.** As session 6, with the Client Hub signal now built. New: whether a logged in client should also see a Learning Hub shortcut on the Client Hub side, which is a Client Hub change.

## Session 9, 2 November 2026

Commit `634014e` on main.

**Built.** Stage C of the redesign: arms and safeguards. The `education` arm is added to `arms.json`, `ARMS` in `functions/core.js` and `scripts/upload.mjs` (9 arms; Elite and Performance stay as `elite` until Sarah decides). The scope and crisis lines (education not therapy; call or text 1737; 111 in an emergency) are written once, as `SUPPORT` in `layout.js`, and shown in 3 places: the dashboard's Support card, a line under every lesson's controls, and the new `check` step. `check` is a suitability self check for the first lesson of a programme: a short scope paragraph, the signs it may not be the right time, 1 question and 2 answers; choosing "not right now" shows its feedback plus the support lines and the practice contact, and nothing blocks Next, so the learner can carry on, stop or come back. The Reset's first lesson opens with one as sample content. The privacy statement now names plans and scenario answers among what stays on the device, and says lesson rather than topic.

**Files changed.** `public/assets/js/layout.js` (`SUPPORT`), `player.js` (`check` step), `viewer.js` (Support card and lesson footer from `SUPPORT`), `public/index.html` (footer line), `hub.css`, `public/privacy/index.html`, `public/content/arms.json`, `functions/core.js`, `scripts/upload.mjs`, `public/content/lessons/the-tunnel-and-the-way-back.json` (check step), `docs/content-format.md`, `docs/redesign-plan.md`.

**Checked.** Function tests (11) and contrast (14 pairings) pass; JSON parses. In the local preview: the Reset's first lesson opens on Before you start with 3 signs and 2 answers; choosing not right now shows the feedback, the support lines and the contact placeholder; Next still moves to step 2 of 10; the support line shows under the lesson controls. No console errors beyond the expected emulator check. Not deployed.

**Decisions and why.**
1. 1 constant for the support wording, so a change to the 1737 line or the contact email is made once and appears everywhere.
2. The check never blocks the lesson. Sarah's proposal asks for a self check, not a gate, and a gate would need to decide who may learn, which the Learning Hub should not do.
3. The check's answer is kept in the browser with the scenario answers; nothing about it is sent anywhere.
4. The sample check sits at the start of the Reset rather than only before specialist programmes, so Sarah can see and edit the wording now; she may move or remove it.

**Charlotte to configure.** Nothing new. `npm run deploy:hosting` when you want stages A to C live. `npm run deploy:functions` (once the Stripe key is set) carries the education arm into the functions.

**Open questions.** As session 8, plus: Sarah's wording for the check step and whether the Reset should have one; the practice contact email, which now appears in 4 places from the 1 constant.

## Session 8, 2 November 2026

Commit `d6c1adc` on main.

**Built.** Stage B of the redesign: the learner dashboard. Home now opens on 6 cards from Sarah's proposal: Continue (the lesson to pick up, its programme and minutes, 1 button reading Start, Continue or Start the next lesson), Where you are in the loop (the current programme as Centre, Clarify, Choose and Return, each done, in progress, to come or coming soon; no percentage), This week's practice (the latest plan written anywhere in the programme, when it was written, and a reminder that the next lesson starts by asking how it went), Tool library (1 button per tool), Next step (the next programme for the member's arm that has not been started) and Support (education not therapy, 1737, 111, the practice contact). The full library, grouped by programme and course, follows below. Each lesson now records when it was last touched (`at` in its localStorage record), which is how the dashboard picks the current programme and the lesson to continue. The sidebar's home button reads Home.

**Files changed.** `public/assets/js/viewer.js` (dashboard helpers and render), `player.js` (`at` on save), `public/index.html` (Home copy), `public/assets/css/hub.css` (dashboard, loop segments, tool list), `docs/redesign-plan.md` (status).

**Checked.** Function tests (11) and contrast (14 pairings) pass. In the local preview: with lesson 1 finished and Centre at step 3, Home shows Continue Centre, the loop with Centre in progress and the other 3 coming soon, the plan from lesson 1 written today, the tool, and the next step note; with the browser storage cleared, it shows Start The Tunnel and the way back, Centre to come, and the empty plan text. No console errors beyond the expected emulator check. Not deployed.

**Decisions and why.**
1. The current programme is the one touched most recently, then the one for the member's arm, then the first. No server state is needed.
2. A loop segment with no published lessons reads coming soon rather than being hidden, so the learner sees the whole shape of the programme from day 1.
3. Done segments use ink on the warm white text pairing already in the contrast check (6.65:1); nothing new to verify.
4. The dashboard cards and the library sit on 1 page rather than 2 views, so a lesson is never more than 1 tap away and the `/`, `/library/` and `/hub/<slug>/` addresses are unchanged.
5. Live groups in Next step are not modelled yet; the card shows the next programme only.

**Charlotte to configure.** Nothing new. `npm run deploy:hosting` when you want stages A and B live.

**Open questions.** As session 7, plus the practice contact email for the Support card (placeholder now, the same as the help dialog), and whether live groups should appear in Next step and where their dates would come from.

## Session 7, 2 November 2026

Commit `d16d759` on main.

**Built.** Stage A of the redesign to Sarah's architecture (`docs/redesign-plan.md`, approved by Charlotte). Content is now 3 layers: `programmes.json` (an ordered list of courses), `courses.json` (foundation, bridge or tool; an ordered list of lessons; a loop move) and `lessons/<slug>.json`. Lessons run the 5 beats and each step carries a `beat` label shown above the heading; text steps may carry a `claim` label (established research, applied practice, Executive Frame method). 3 step types are new in `player.js`: `scenario` (a situation, 3 or 4 responses, feedback on each, a darker rule on the method's response, nothing scored), `plan` ("When X, I will Y", saved with the date) and `return` (the previous lesson's latest plan, shown at the start of the next lesson with a box for how it went). The viewer groups the library by programme and course, the sidebar shows course headings with the layer, and the right column lists reflections and plans together. The sample Autonomy topic is replaced by 2 sample lessons (The Tunnel and the way back; Centre) and 1 sample tool (Centre in 90 seconds). "Topic" is now "lesson" in the code and copy. The localStorage key keeps its `ef-hub-` prefix so nothing a tester has done is lost.

**Files changed.** New: `docs/redesign-plan.md`, `public/content/programmes.json`, `courses.json`, `lessons/the-tunnel-and-the-way-back.json`, `lessons/centre.json`, `lessons/centre-in-90-seconds.json`. Rewritten: `player.js`, `viewer.js`, `docs/content-format.md`. Changed: `public/index.html`, `hub.css`, `viewer.css`, `README.md`, `CLAUDE.md`. Removed: `content/topics.json`, `content/topics/autonomy.json`.

**Checked.** Function tests (11) and contrast (14 pairings) pass; every JSON file parses. In the local preview at desktop width: the library shows The Executive Frame Reset with its 2 published courses and the Tools section; lesson 1 runs all 9 steps by keyboard; the scenario shows feedback and the closing note and stores the choice; the plan saves both fields with a date; Finish returns to the library with the finished note; the Centre lesson opens on its Return step showing lesson 1's plan; the claim label shows on Centre step 3; the tool opens; an unknown slug shows the not available page. No console errors beyond the expected emulator check. The design hook flags a navy glow shadow on `index.html` that predates this session and is not in that file; left as it is.

**Decisions and why.**
1. The 3 index files rather than 1 catalogue file, so Sarah's export can write programmes, courses and lessons separately and a draft course in a published programme is simply skipped.
2. A lesson's progress is keyed by slug, not by programme, so a foundation course shows the same progress in every programme that includes it.
3. The return step finds the previous lesson within the first programme that holds its course, then falls back to the library order, so the Reset's lesson 2 always looks back at lesson 1.
4. Scenarios are never scored and every option can be tried, keeping to the no points, no badges rule.
5. The plan and scenario answers join reflections in localStorage under the same key; nothing new is sent anywhere.

**Charlotte to configure.** Nothing new. As session 6: the Stripe key, `deploy:functions`, DNS for learn.executiveframe.co.nz (check what is on CloudCannon first), the website buttons. Stage A is not deployed; `npm run deploy:hosting` when you want it live.

**Open questions.** As session 6, plus: Sarah's review of the 2 sample lessons and the tool before they are shown to anyone; whether the free tool opens without an account (it is behind the member gate now); whether Elite and Performance are 1 arm; the Reset's real lesson sequence so stage B's loop segments match.

## Session 7, 10 November 2026

Commit `1e75a1c` on main.

**Built.** The start page now routes a logged in client automatically. After checkAccess says there is no Learning Hub membership, `start.js` calls the Client Hub's new function `hasClientHub` (codebase `clienthub`, same project and region, so the existing Content Security Policy already allows it) and sends a client straight to the Client Hub. If the call fails or answers false, the page falls back to the join or account view with the Client Hub link beside it, as before. A member who is also a client still lands in the Learning Hub first. The Client Hub side was built in its own session (efclienthub commit `48b0c1a`, decision 60 there): the function answers only the signed in person's own browser, true for an open client record or a staff claim, and logs no one.

**Files changed.** `public/assets/js/start.js`, `README.md` (membership process step 0).

**Checked.** Function tests (11) and contrast (14 pairings) pass. Both start page views render in the local preview with no console errors. The logged in path cannot be exercised locally and was not exercised live: the Firebase CLI login on the Mac had expired, so neither `deploy:hosting` here nor `deploy:functions` in efclienthub has run yet.

**Decisions and why.**
1. The signal lives in the Client Hub, not here. The Learning Hub never reads the `clienthub` database; the Client Hub answers from its own records, to the person's own browser, about themselves, and the answer is not stored or logged (Health Information Privacy Code 2020).
2. Membership wins over client status. A person with an active Learning Hub membership goes to the library even if they are also a client, because the start page lives on the Learning Hub and the Client Hub is 1 link away.
3. The function call failing is not an error for the person: the page simply shows the choice it showed before.

**Charlotte to configure.**
- `npx firebase login --reauth`, then `npm run deploy:hosting` here and `npm run deploy:functions` in ~/efclienthub, so the start page and `hasClientHub` go live together. Then try the start page logged in as a test client and as a member.
- As session 6: website buttons to `/start/`, `CLIENT_HUB` at launch, the Stripe key, DNS.

**Open questions.** As session 6, with the Client Hub signal now built. New: whether a logged in client should also see a "Learning Hub" shortcut on the Client Hub side, which is a Client Hub change.

## Session 6, 1 November 2026

Commit `3ed3617` on main.

**Built.** The start page, `/start/`, from the meeting with Sarah and Levi on 1 November: the 1 address the public website, Sarah's emails and the Client Hub send people to. A logged in member goes straight to the Learning Hub, or to `?next=/hub/<slug>/`. Someone logged in without a membership sees Join (or Your account, if they have had a plan or an organisation place) and the Client Hub side by side, with a log out link. Everyone else sees 3 path cards: I am a client (the Client Hub), I am a Learning Hub member (log in, which returns to the start page), and I am new here (Join, with `?arm=` carried through). The trial length comes from `plans.json`. The Client Hub address is 1 constant, `CLIENT_HUB` in `app.js`. README has a table of the addresses the website buttons and emails should use.

**Files changed.** New: `public/start/index.html`, `public/assets/js/start.js`. Changed: `public/assets/js/app.js` (Client Hub address), `public/assets/css/base.css` (path cards), `README.md` (membership process step 0, repository tree, links from the website and emails), `docs/firebase-setup.md` (launch step for the Client Hub address).

**Checked.** Function tests (11) and contrast (14 pairings) pass. In the local preview at desktop and phone width: the 3 path cards, `?arm=neurodiversity&next=/hub/planning/` carried into the log in and join links, the logged in view (`?view=member`, preview only), no console errors. `deploy:hosting` completed and https://executiveframe-learninghub.web.app/start/ serves the page. The logged in paths were not exercised against live sign in, because the Stripe key is not yet set, so checkAccess is not deployed.

**Decisions and why.**
1. The start page never works out who is a client. The Client Hub recognises clients from its own database, which the Learning Hub must never read, and it sets no claim on the shared login for clients (only `practitioner` and `admin`). So the Client Hub link is offered to everyone alike, and nothing in any address says who is a client (Health Information Privacy Code 2020).
2. The automatic client routing described to Sarah (a logged in client sent straight to the Client Hub) needs a signal from the Client Hub, for example a callable in the `clienthub` codebase that tells the person's own browser whether they have a Client Hub account. That is a Client Hub change and is listed as an open question.
3. The website keeps 1 address for every button (Open my hub, I am a client, Get started), so CloudCannon never needs login state.
4. The meeting router skill was not used for this meeting (Charlotte's instruction); no Notion cards or email drafts were made from it.

**Charlotte to configure.**
- Website (CloudCannon, log in the Site Changes Log): point every hub button at `https://executiveframe-learninghub.web.app/start/` (later `https://learn.executiveframe.co.nz/start/`); arm pages and Sarah's email use `/start/?arm=<slug>`.
- At launch, change `CLIENT_HUB` in `app.js` to `https://clients.executiveframe.co.nz/` once the Client Hub's DNS is connected.
- As before: the Stripe key, then `deploy:functions`, and DNS for learn.executiveframe.co.nz.

**Open questions.** As session 5, plus: whether the Client Hub should expose a small callable so a logged in client skips the start page's choice; and whether the start page should also be the viewer's default sign out destination.

## Session 5, 1 November 2026

Commit `8e4fa02` on main.

**Built.** `CLAUDE.md` records the working rules for every session: the shared `ef-client-hub` project and the parts the Learning Hub owns, Stripe only in Sarah's Executive Frame account with test keys, `pricingTier: "partner"` and browser only learner data, npm scripts for every repeatable task with secrets typed at hidden prompts, UK English with no dashes or testimonials, the Notion Worklog and Site Changes Log. The Learning Hub's Firebase parts now exist: the `learninghub` database, the Hosting site and Storage bucket `executiveframe-learninghub`, the registered web app (real values in `firebase-config.js`), the authorised sign in addresses with email and password on, and the functions' service account access. Rules and hosting are deployed; the pages are live at https://executiveframe-learninghub.web.app. Sign in is email and password only: the Google and Microsoft buttons, provider code, OAuth and Entra setup steps and icons are removed, and the Content Security Policy no longer allows apis.google.com or pop ups. The address is `learn.executiveframe.co.nz` throughout (was app.), and the custom domain is added to the site, waiting for DNS. `setup:check` now lists the DNS record to remove as well as the one to add.

**Files changed.** New: `CLAUDE.md`. Changed: `README.md`, `docs/firebase-setup.md`, `firebase.json` (CSP, COOP), `functions/core.js` and `functions/test/core.test.js` (address), `package.json`, `public/assets/js/firebase-config.js`, `app.js`, `account.js`, `join.js`, `login.js`, `public/join/index.html`, `public/login/index.html`, `public/privacy/index.html`, `scripts/setup.mjs`, `scripts/stripe-portal.mjs`, `scripts/tasks.mjs`. Removed: `public/assets/auth/google.svg`, `microsoft.svg`.

**Checked.** Function tests (11), contrast (14 pairings) and the security rules tests (10, in the emulators on the Mac) pass. `setup:check` reads done for every step except the Stripe key and the domain. Login and Join open with no console errors in the local preview at desktop width. The live site serves the new pages with the tightened policy and no provider buttons. `deploy:rules` and `deploy:hosting` completed; `deploy:functions` waits for the Stripe key.

**Decisions and why.**
1. Sarah's architecture proposal (1 November) suggested LearnWorlds. Charlotte's decision: build Sarah's design (foundation courses, arm bridge courses, tools, programmes, the learner dashboard) in this Firebase app, keep the subscription model, and keep 1 login with the Client Hub. The redesign is outlined, not started.
2. Address `learn.executiveframe.co.nz`, as Sarah proposed, rather than app.
3. Email and password only (Charlotte). Fewer moving parts, no OAuth clients or Entra registration, and the Microsoft unconfirmed email question (session 1, open question 9) goes away.
4. The password policy step was left out, because it would change sign up for the Client Hub too.
5. Setup was run 1 step at a time with `--only`, from Charlotte's terminal, so every change to the shared project was confirmed by her.

**Charlotte to configure.**
- Stripe: Sarah invites hello@charlotteprice.co.nz as Administrator on the Executive Frame account and creates the restricted test key (`docs/firebase-setup.md` section 4). Then `npm run setup -- --only=secret`, `npm run deploy:functions`, `npm run logs`, and the step 6 test mode checks.
- DNS: `learn.executiveframe.co.nz` currently points at `sites.cloudcannon.com` (the public website). Check what lives there with Sarah before changing it. To connect: remove that CNAME, add CNAME `learn.executiveframe.co.nz` to `executiveframe-learninghub.web.app`, log it in the Site Changes Log, then at launch set `authDomain` in `firebase-config.js` to `learn.executiveframe.co.nz` and `npm run deploy:hosting`.
- Notion: share the learning resources database (`1dab155b5e2e476d994f4f334b489f5b`) with the Claude connection, or move it into Charlotte Price's Space, so the content export can be built.

**Open questions.** Session 1's questions 1 to 8 and 10 remain; 9 is closed. New: what is at learn.executiveframe.co.nz on CloudCannon today, and may it move; Charlotte's approval of the redesign outline (3 content layers, 5 beat lessons with new `scenario` and `plan` step types, the dashboard, an `education` arm, Elite and Performance merged or not); Sarah's own open items (S.H.I.F.T. wording, Elite vs Performance, email platform); project ownership under Sarah's account.

## Session 4, 18 October 2026

**Built.** The Learning Hub now follows the Client Hub's setup process and lives beside it in the `ef-client-hub` Firebase project, which the shared login requires. It keeps its own Firestore database (`learninghub`), Hosting site and Storage bucket (`executiveframe-learninghub`) and functions codebase (`learning`). The bash `./tasks` runner is replaced by `npm run` scripts on the Client Hub pattern: `setup:check` and `setup` (with `--only`, `--dry-run`, `--plan`, `--yes`), `tasks`, `stripe`, `secret`, `orgs`, `upload`, `serve`, `vendor`, `contrast`, `check`, `test:unit`, `test:rules`, `test`, `emulators`, `deploy:rules`, `deploy:functions`, `deploy:hosting`, `deploy`, `logs` and `worklog`. The Firebase SDK and Figtree (now with Latin Extended for macrons) are self hosted, a Content Security Policy is set, and inline scripts are removed. Security rules tests and a colour contrast check are added.

**Files changed.** New: `package.json`, `firebase.test.json`, `scripts/setup.mjs`, `scripts/tasks.mjs`, `scripts/stripe.mjs`, `scripts/orgs.mjs`, `scripts/upload.mjs`, `scripts/vendor.mjs`, `scripts/check-contrast.mjs`, `scripts/worklog.mjs`, `tests/rules.test.js`, `public/assets/js/firebase-config.js`, `public/assets/js/settings-early.js`, `public/assets/vendor/firebase/`, `docs/firebase-setup.md`. Changed: `.firebaserc`, `firebase.json`, `firestore.rules` and `storage.rules` comments, `functions/index.js` (named database and bucket), `functions/core.js` (allowed addresses), `app.js` and the account page scripts (vendored SDK), fonts, `README.md`. Removed: `tasks`, `scripts/add-organisation.mjs` (now `npm run orgs`), `docs/setup.md` (now `docs/firebase-setup.md`). Renamed: `scripts/preview.mjs` to `scripts/serve.mjs`.

**Checked.** Function tests (11) and the contrast check (14 pairings) pass; `setup:check` and `setup -- --plan` run; the viewer and account pages work with the self hosted SDK at 3 widths with no page errors. `npm run test:rules` could not run here (the emulator download is blocked in this workspace); it needs running once on the Mac.

**Decisions and why.**
1. Same project as the Client Hub, because shared sign in only works within one Firebase project. Separate database, site, bucket and codebase, so neither app's deploys or rules can reach the other's records.
2. The project wide password policy is opt in (`--only=passwordpolicy`), because enforcing it changes sign up for the Client Hub too.
3. The Microsoft client secret goes straight from the Azure CLI to Firebase when the Azure CLI is used, and is otherwise typed at a hidden prompt; it is never printed or stored in the repository.
4. The functions' service account gets the signing role on itself and read access to the library bucket only, rather than project wide storage access.

**Charlotte to configure.** Run the steps in `docs/firebase-setup.md` from section 2: `npm run setup`, the Google sign in browser step, the Stripe dashboard steps, `npm run stripe -- prices/portal/check` once prices are confirmed, then the 3 deploys and `npm run test:rules`.

**Open questions.** As before. The project sits under Charlotte's account, as the Client Hub's does; moving ownership to Sarah's account remains open for both apps.

## Session 3, 18 October 2026

**Built.** A terminal runner, `./tasks`, covering every build, setup and admin step that has a command line or API route (Charlotte's request). Local: `doctor`, `install`, `test`, `preview`, `emulators`. Google and Firebase: `login`, `firebase:project` (optionally inside Sarah's Workspace organisation), `firebase:owner`, `firebase:billing` (link plus NZ$10 budget alert), `firebase:apis`, `firebase:firestore`, `firebase:storage`, `firebase:webapp`, `firebase:signing`, `microsoft:app` (Entra registration through the Azure CLI), `firebase:auth` (email and password, password policy, authorised domain, Microsoft and Google providers through the Identity Toolkit API), `firebase:secret`, `firebase:domain` (connects the domain and prints the DNS records), `firebase:all`. Stripe: `stripe:prices`, `stripe:portal` (customer portal by API), `stripe:check`. Running: `deploy`, `deploy:site`, `deploy:functions`, `deploy:rules`, `logs`, `org:add`, `upload`.

**Files changed.** New: `tasks`, `scripts/stripe-portal.mjs`, `scripts/stripe-check.mjs`, `scripts/preview.mjs`. Renamed and rewritten: `docs/console-setup.md` is now `docs/setup.md`, in terminal order. Updated: `README.md`, comments in `scripts/stripe-setup.mjs` and `scripts/add-organisation.mjs`.

**Checked.** Syntax and ShellCheck clean; every Firebase CLI command and gcloud flag used was confirmed against the installed tools; Stripe portal settings checked against the Stripe library's types; `help`, `doctor`, `test`, `preview` and the deploy confirmation run here. The steps that create or change Google and Stripe resources have not been run, because they act on Sarah's accounts.

**Decisions and why.**
1. One script with named steps rather than a single all-in-one command, so each step can be rerun on its own and anything irreversible asks first.
2. Secrets are typed at a hidden prompt and passed straight to the command that stores them, never to a file or the shell history.
3. JSON is handled with Node rather than jq, which is not on every Mac.

**Still manual (no command line route).** Billing account with Sarah's card; possibly one Authentication, Get started click; the Google sign-in client (console Enable switch); Stripe team invite, restricted key, customer emails and branding; DNS records at the DNS host.

**Open questions.** As before, plus: which Google account will run `./tasks firebase:project` (it should be Sarah's Workspace account so the project sits in her organisation).

## Session 2, 18 October 2026

**Built.** The member area is now one desktop viewer, after the Themescape viewer, replacing the separate Library and topic pages (Charlotte's direction). `public/index.html` is the viewer; `/`, `/library/` and every `/hub/<slug>/` open it, so topic addresses for the Client Hub are unchanged and `#step-n` still opens a step. Layout: a header with the topic title and summary; a foldable library sidebar on the left with topic search, every topic and its progress, the open topic's steps (any step can be opened), Help and support, Viewer settings, and the account menu at the bottom (My account, Help and support, Log out and exit); the stage in the middle showing one step at a time; and a foldable Notes and files column on the right (about the topic, free notes, the learner's reflections with a link to each step, and the topic's downloads with the trial allowance). Fold state is remembered. On phones both sidebars become drawers opened from the header. Membership is checked behind a cover screen before anything shows, as in Themescape's gate.

**Files changed.** New: `assets/js/viewer.js`, `assets/js/player.js` (the step renderers from the old hub page, now reusable), `assets/css/viewer.css`. Replaced: `public/index.html`. Removed: `public/library/`, `public/hub/`, `assets/js/library.js`, `assets/js/hub.js`. Updated: `firebase.json` (rewrites), `gate.js` (sends members without access to Account if they have had a plan, otherwise Join), links in the account pages, the placeholder brand SVGs (were not valid as image files), `README.md`, `docs/content-format.md`.

**Checked.** Viewer exercised in Chromium at 1440, 1024 and 390 pixels: topic opening, Next and Back, arrow keys, the triangle, the step list, folding both columns, phone drawers, notes and reflections kept after reload, deep links, an unknown topic, the account menu, the log out dialog and viewer settings. No page errors and no scrolling outside the viewer. Function tests still pass.

**Decisions and why.**
1. Login, Join, Account, Thank you and Privacy stay as separate pages, as Themescape keeps its account pages outside the viewer.
2. The header band uses the app theme (sky), not navy, because the brand kit keeps the inverted navy theme for calls to action only.
3. Viewer settings (text weight light or regular, text size, motion) are saved in the browser. Text weight answers the brand kit's note that body weight 400 may be adopted.
4. Log out and exit offers to clear the learner's progress, notes and reflections from the browser, for shared computers, as Themescape's log out does.
5. Topic files load together when the viewer opens, so the library shows every topic's progress. Revisit if the library grows past about 30 topics.

**Charlotte to configure.** Nothing new beyond session 1.

**Open questions.** As session 1, plus: the help text's contact email, and whether learners should be able to open any step from the step list or only steps they have reached (currently any).

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

**Charlotte to configure.** Full checklist in `docs/setup.md` (was console-setup.md). Firebase: create the project under Sarah's account on Blaze; Firestore and Storage in australia-southeast1; enable Google, Microsoft (Entra app registration) and Email/Password with the 10 character policy; authorised domain; `STRIPE_SECRET_KEY` secret (restricted test key); Service Account Token Creator role for signed links; custom domain at launch. Stripe: Administrator invite; restricted key; run `scripts/stripe-setup.mjs` once amounts are confirmed; customer portal (cancel at period end, card update, monthly and annual switching); receipt, trial ending and failed payment emails; branding; Stripe Tax if registered.

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
