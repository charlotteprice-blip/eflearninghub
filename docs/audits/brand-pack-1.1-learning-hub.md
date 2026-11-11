# Brand pack 1.1 in the Learning Hub

Date: 12 November 2026. Branch `brand-pack-1.1`, cut from `main` as it was live. Not merged, not pushed, not deployed.

This is the record of applying Levi Wilson's brand pack 1.1 (11 November 2026) and his feedback to the Learning Hub, by the decisions Charlotte approved for both hubs. The Client Hub is being changed from the same decisions in its own branch, and the notice, status pill and header lockup here were written to match its component: same markup, same icons, same words, same sizes.

## What changed, by decision

| Decision | What changed | Commit |
| --- | --- | --- |
| 1. Buttons are pills | `.btn` (primary, secondary, quiet), the icon buttons in the header and columns, and the column tabs are pills. The segmented control is a pill and keeps its options on 1 row. Fields stay 8 px, navigation items, choice cards and scenario options 12 px, cards 16 px. The secondary keeps its warm white fill and white hover; the pressed state is unchanged. | 14cecb5 |
| 2. Primary button stays navy | `.btn-primary` reads `--primary` and `--on-primary`, which the token script sets to navy and warm white. The pack's slate is not followed for this 1 value; the reason is written at `PRIMARY` in `scripts/tokens.mjs` and beside the token in `tokens.css`. | 79cdb08, 14cecb5 |
| 3. Body weight stays 400 | No change to the app. The comment in `tokens.css` now says both apps use 400, with 300 as a viewer setting. | 79cdb08 |
| 4. Tokens come from the pack | `brand/ef-tokens.json` is the pack's file, unchanged. `npm run tokens` (`scripts/tokens.mjs`, listed in `npm run tasks`) writes the palette, the 2 themes, the application colours, spacing (now 9 steps), radius and motion into a marked block of `public/assets/css/tokens.css`. The app's own type sizes, control sizes and every existing token name still work. `npm run check` now fails if the generated files are out of date. `scripts/check-contrast.mjs` reads the generated file. | 79cdb08 |
| 5. Status and notice colours | The pack's application colours: success #285E44 on #E3EFE8, warning #73540F on #F7EDD4, error #8A3F34 with tint #F6E3DF, info #3E5680 on #E6ECF4. Done is success, in progress is info, attention is warning. The contrast check has every pair: each colour on its tint and on warm white, and ink on each tint. All pass, lowest 5.96:1. | 79cdb08, 1160ce0 |
| 6. A notice is 1 component | `.notice` with `.notice-info`, `.notice-success`, `.notice-warning`, `.notice-error`: a 16 px stroked icon and a word (Note, Done, Attention, Problem) in the kind's colour, on its tint, with the text in ink. No coloured edge. Built by `notice()` in `ui.js`, or the same markup in a page. Used for: the finished note on Home (success), the failed payment and cancelled plan note (warning), confirm your email on Join (warning), the closing note of a scenario and sort feedback (info). | 1160ce0 |
| 7. Status pills | A 16 px icon and a word, built by `statusPill()` in `ui.js`: a half filled circle for in progress, a ticked circle for done. Not started is the neutral `.tag`, which now has a hairline so it shows on warm white. | 1160ce0 |
| 8. No shadows | The sort step's drag ghost has no shadow: a slate border and a tilt show it moving. A chosen sort item is filled sky like other chosen states, not ringed with an inset shadow. The stage's hairline edge is a border. No element in the app has a `box-shadow`, and `npm run check` now fails if 1 is added. | 14cecb5, 1ca64c4 |
| 9. Mark, lockup, favicons | Every placeholder in `public/assets/brand/` is gone. The pack's `02-logo` SVGs are there unchanged, with the app icons in `app-icon/` and a new README. Page headers and the viewer header show `ef-lockup-slate.svg` as an image, 150 px wide (mark 24 px; the minimum is 140 px), with Learning Hub beside it as plain text, 12 px away after a hairline (the clear space is 10 px). A logged in member on a phone gets `ef-mark-slate.svg` alone at 28 px. The pack's favicon files and `site.webmanifest` are at the top of `public/`, and the pack's head snippet is on all 8 pages. | e8782e4 |
| 10. Loading | Loading states and the viewer's cover show the mark built from the pack's loop and triangle paths (`public/assets/brand/mark.svg`, written by `npm run tokens`, stroke 5, `pathLength="100"`). On the first page of a visit the loop traces over 1200 ms while the triangle fades in, once. After that, and under reduced motion or Keep it still, the finished mark is shown still. The unused `pulse` class is removed. | e8782e4 |
| 11. No dark mode | None added. The only thing that reacts to dark mode is the pack's own `favicon.svg`. | |

Learning Hub only:

| Note | Outcome | Commit |
| --- | --- | --- |
| 1. Library search label | The label Find a lesson was there for screen readers only, with the same words as a placeholder. It is now a label that can be seen above the box, and the placeholder is gone. | 6c4e931 |
| 2. Loop row inside its card | Already fixed on 11 November (finding 5). Checked again from 320 to 1920 px: the last box ends 24 px inside the card. | |
| 2. Centre in 90 seconds on 1 line | Not fixed before: at 1280 px the button wrapped onto 2 lines. Dashboard cards are now 336 px or wider, so the button is on 1 line at 375, 768, 1024, 1280, 1440 and 1920 px. At 1280 px the dashboard is 1 column and the loop is 4 boxes in a row; at 1440 px it is 2 columns and the loop is 2 by 2. At 320 px the label takes 2 lines. | 6c4e931 |
| 3. Return as a 4th stage | Not changed. See the list below: it is Sarah's. | |
| 4. In use, app, and the checklist | Fixed where clearly within the decisions: step buttons in the library are 44 px high (they were 36 px, under the 44 point minimum), and the Back and Next bar has a flat fill in place of a fade (the brand has no gradients). The rest is listed below. | 6c4e931 |

Also in e8782e4: pages preload the regular weight of Figtree, which body text has used since the alignment (they preloaded the light weight), and the preview server knows the icon file types.

## What was checked

- `npm run check`: 27 unit tests, the generated files up to date, every contrast pair (34 in all), no `box-shadow` and no colour written into a rule in `base.css`, `hub.css` or `viewer.css`.
- In headless Chromium against the preview from this working copy, at 375, 768 and 1440 px (and 320, 599, 600, 719, 1024, 1280, 1920 px where a breakpoint matters):
  - The header lockup: 150 by 24 px and loaded on every page for a guest; Learning Hub 12 px after it from 521 px up; for a logged in member the lockup with no app name from 600 to 719 px and the mark alone below 600 px; 1 line and no overflow at every width. In the viewer the lockup shows from 900 px.
  - The favicon, ICO, touch icon and manifest links are on all 8 pages, every file answers 200, and nothing is requested from another address.
  - The draw on: on the first page of a visit, half way through, the loop is half drawn and the triangle half faded in; it finishes complete; the next page shows the mark still. Under reduced motion the finished mark is there at 300 ms.
  - No element has a shadow. Every button is a pill; navigation items and scenario options are 12 px.
  - Notices and pills on Home and in a lesson, by eye in screenshots.
  - Every page and state from the 11 November test pass again: start, join (every step, choice and error), login, account in 8 membership states, thank you, privacy, 404, Home fresh and finished, empty and failed, all 3 lessons to Finish, the restart button, the dialogs with every setting on, drawers and folds, and 1 lesson by keyboard only. Signed in states were reached by standing in for `app.js` inside the test browser.
  - No target under 44 px in the viewer, on Home, or on the join, login and start pages.
- The Content Security Policy in `firebase.json` was read, not changed. Everything new is served from the site itself: the favicons and lockup are images (`img-src 'self'`), the manifest falls under `default-src 'self'`, and the mark is inlined from a same site file as before.

Not checked: real phones, Safari and Firefox, a real login, the favicon as a browser actually draws it in a tab (the files and links were checked, a headless browser has no tab strip), and the home screen icon after Add to Home Screen.

## Matched to the Client Hub

The Client Hub's branch was read (not changed) and its choices copied where the shared decisions were silent:

1. Notice words Note, Done, Attention, Problem; a view may pass its own word to `notice()`.
2. Notice shape: tint fill, no edge bar, 12 px corners, 16 px padding, icon and word in the kind's colour, text in slate.
3. The 5 icons use the Client Hub's path data on a 16 unit box, so they are the same drawings.
4. The plain tag: warm white, 1 px hairline, 28 px, no icon.
5. The lockup at 150 px with the app's name after a hairline. The Learning Hub's lockup is in the header, which had room; no column was widened.
6. `theme-color` navy, from the pack's snippet.
7. The mark draws on once per visit and is still after that.
8. The pack's SVGs are copied byte for byte, content credentials included.
9. The navy primary is kept in 1 named place with a comment.
10. The check for shadows and for colours written into rules (commit 1ca64c4). It flagged 13 values that were already there: the white hover is now the token `--white`, and the hover washes, the drawer scrim and the dialog backdrop are mixed from palette tokens with `color-mix`, as the Client Hub writes them. Browsers from before 2023 do not know `color-mix` and show those hovers and dimmers without their tint; nothing else changes for them.

Where the 2 differ in how, not in what:

- The Client Hub keeps its app values in `brand/app-tokens.json` and the mark's paths in `public/js/mark-paths.js`. The Learning Hub has no second token file: the navy override is the constant `PRIMARY` at the top of `scripts/tokens.mjs`, the app's own values stay hand written in the lower block of `tokens.css`, and the mark is written to `public/assets/brand/mark.svg`, which `layout.js` already inlined. The values and the drawing are the same.
- Token names: the Client Hub's application colours are `--app-success` and so on; here they are `--success`, `--warning`, `--error`, `--info` with `-tint`, beside the existing `--status-*` names. A shared component needs 1 set. Worth settling when the 2 token files are next brought together.

## Done differently from the shared decisions, and why

1. Decision 6 says tinted. The notice has no coloured edge and its text is ink, not the kind's colour: this is the Client Hub's component as its branch has it, copied so the 2 match. Only the icon and the word take the colour.
2. Decision 9 says the lockup, not live text. On phones the viewer header still names the app in plain caption text and shows no logo: the lockup, its clear space and the 2 header buttons do not fit a 375 px header on 1 line. It is listed below.
3. Decision 1 says every button. The library's navigation rows, the account button and the scenario and sort options are not pills: they are navigation items and choice cards, which the decision keeps at 12 px.

## What still conflicts with the guidelines, and whose decision

| # | Conflict | Whose |
| --- | --- | --- |
| 1 | Return is shown as a 4th stage beside Centre, Clarify and Choose (the dashboard's loop card, the lesson beat label). The pack names the C3 Loop as Centre, Clarify, Choose, then return. | Sarah |
| 2 | Quiet ink, `--ink-quiet` #445C86, is a 5th colour. The guidelines say there is no muted text colour and captions are slate at the light weight. It was added on 11 November at Charlotte's request to replace text dimmed with opacity, and passes contrast. Dropping it means secondary text becomes plain slate. | Charlotte and Levi |
| 3 | Captions are weight 400. The guidelines set captions and body in Light. Body stays 400 by decision 3; captions follow it here. | Levi, when he updates the guidelines |
| 4 | Dark mode. The guidelines say the app's inverted theme follows the device. Decision 11 leaves it out of this release. | Charlotte |
| 5 | The privacy statement says "the arm you joined through". The guidelines keep arms out of public copy: the word is pathway. The address still uses `?arm=`, which is internal and must not change once links are published. | Sarah, with the rest of the privacy wording |
| 6 | On phones the viewer header has no logo, only the app's name as text. Options: the mark alone at the left, or the lockup on its own line. | Charlotte and Levi |
| 7 | The progress bar is 6 px. The guidelines ask for a thin hairline bar. | Levi |
| 8 | Loading screens, the membership cover and the step count are centred. The guidelines say left align everything, in the typography section. | Levi |
| 9 | `theme-color` is navy, from the pack's head snippet, so a phone browser's top bar is navy above a sky page. The manifest also names both hubs "Executive Frame", so 2 home screen icons would carry the same name. | Levi |
| 10 | Button and card hover is white, #FFFFFF, kept by decision 1. The guidelines name 4 colours and allow white only as a ground the logo may sit on. | Levi, to confirm |
| 11 | Status pills use the application colours on lesson cards. The guidelines keep those colours to forms and messages. Decision 7 asks for the pills. | Levi, to confirm |
| 12 | The sample lesson Centre says "It does not fix anything." Fix is on the do not say list. All 3 lessons are sample content awaiting Sarah's review. | Sarah |
| 13 | At 320 px the Motion setting's 2 labels each take 2 lines inside the pill. | Charlotte, low priority |
| 15 | The loop step in a lesson draws its own shape: a dashed ring, a triangle and a labelled circle at each point, which the learner turns. The guidelines call the mark the only drawn element in the identity, and describe the mark in 3 frames as the way to explain Centre, Clarify and Choose. The step is a teaching diagram, not the logo, but the 2 are close cousins. | Levi and Sarah |
| 14 | Sky is provisional in the pack. Changing it is 1 value in `brand/ef-tokens.json` and `npm run tokens`; the contrast check will say if a lighter sky breaks a pair (slate on sky is 5.21:1 now, the lowest of the theme pairs). | Levi |

## After this branch

- `docs/design-system/` was not touched; the components guide needs rebuilding from this branch (`npm run guide`).
- `README.md` describes `brand/ef-tokens.json`, `npm run tokens` and the brand folder, and no longer lists the brand SVGs as placeholders.
- No work log entry was written for this branch.
