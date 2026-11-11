# Fixes to the Learning Hub audit findings

Date: 11 November 2026. This is the record of what was done about the 27 findings in `impeccable-learning-hub-2026-11-10.md`, checked against the code as it stood after the alignment with the Client Hub (commit 5484d43).

Totals: 19 fixed, 1 already fixed by the alignment, 5 partly fixed, 2 left for a decision.

## How the fixes were checked

- `npm run check` after each group: 27 unit tests pass and every contrast pair passes, including 3 new pairs for the quiet ink token.
- Each fix was looked at in a real browser engine against the local preview on port 5064. The Browser pane in the desktop app was hidden for most of the night, and a hidden pane does not draw frames, so its timing and focus results could not be trusted. The checks below were therefore run in headless Chromium (the copy already on this Mac), driven with real key presses and measured from the page's own geometry, with screenshots read back.
- Widths: 1440, 768, 375 and 320 px, plus a 740 by 360 landscape phone for finding 1. All 3 sample lessons were walked step by step at all 4 widths, choosing a response on every scenario and check step, through to Finish: no sideways overflow, the Back and Next bar always at the bottom, feedback always clear of the bar, no script errors.
- Paths the preview cannot reach (a failed membership check, a failed payment, a cancelled plan, library files that do not load) were exercised by swapping `gate.js` for a stub or answering 404 for the content files inside the test browser. The real pages' code ran; the live functions did not.

## The 27 findings

| # | Severity | Finding | Outcome | Commit | How it was checked, or what is left |
| --- | --- | --- | --- | --- | --- |
| 1 | P1 | Back and Next bar covers the lesson text | Fixed | 8357f5e | Bar bottom equals the sheet bottom at 1440 by 800, 375 by 812, 320 by 568 and 740 by 360. After a scenario choice at 375 px the feedback sits at 444 to 700 px and the bar at 724 to 812 px, and the page no longer jumps to the top. |
| 2 | P1 | Text dimmed with opacity fails contrast | Fixed | e103b74 | New token `--ink-quiet` (#445C86): 4.76:1 on sky, 6.07:1 on warm white, both in `scripts/check-contrast.mjs`. A walk of every text element on Home and in a lesson found no opacity below 1 except the disabled Back button. The 1737 line, the membership status line and the header name are full strength ink. |
| 3 | P1 | Hidden columns in the tab order, drawers do not take focus | Fixed | 43aaebe | At 768 px Home has 10 tab stops and none is off screen (was 12 hidden). Opening a drawer puts focus on its close button and makes the header and stage inert. Escape and the close button return focus to the header button. Folded columns at 1440 px are inert, also after a reload. Choosing a lesson from the drawer puts focus on the step heading. |
| 4 | P1 | 2 focus rings cannot be seen | Fixed | 6c043f6 | Settings: the ring on the chosen option is warm white on navy (9.35:1). Loop: a separate 2 px ring outside the point, seen on a filled and an empty point in screenshots. |
| 5 | P1 | Loop card overflows on Home | Fixed | 8ac26c0 | At 1920, 1440, 1280, 1024, 900, 768, 375 and 320 px the last box ends 24 px inside the card. The boxes sit 2 by 2 and go to 1 row only when the card itself is 520 px or wider. |
| 6 | P1 | Sideways overflow at 320 px in lessons | Fixed | 8ac26c0 | Every step of the 3 lessons at 375 and 320 px: 0 px overflow, Next ends at 296 px of 320, the step count is 1 line above the buttons. |
| 7 | P1 | Failed membership check shows Checking your membership for ever | Fixed | b0db001 | With `gate.js` stubbed to throw, the cover shows the message, Try again (focused) and My account, at 1440 and 320 px, and Try again reloads into the viewer. Not exercised against the live checkAccess function. |
| 8 | P1 | Placeholders a member can see | Partly fixed | 1bbf3b5 | On Charlotte's instruction of 11 November: the contact is consultant@sarahanticich.co.nz as an email link on the Home support card, in Help, in the suitability check and in the privacy statement, and the monthly price reads NZ$29 a month. Wording only: no Stripe price exists. Still placeholders: the annual price (NZ$XX, still marked), the partner rate, the privacy statement's Draft for approval marker and `PRIVACY_VERSION` ending in `-draft`. Decision: Sarah and Charlotte. |
| 9 | P2 | Loop step changes its text off screen on a phone | Partly fixed | 60c2d64 | In 1 column the words for the chosen point now come before the shape: at 375 by 812 the panel sits at 326 to 586 px, above the bar, and pressing Next changes it in view. Left: `touch-action: none` on the shape and on sort items. Changing it alters dragging on a touch screen and needs a real phone to test. The shape was not shrunk, as its labels would fall to about 9 px. |
| 10 | P2 | Screen readers hear each step 2 or 3 times | Fixed | 26df4f8 | `#stage` and `#count` carry no `aria-live`. Feedback takes focus and has no status role. Checked in the page's attributes, not with a screen reader. |
| 11 | P2 | No skip link in the viewer | Fixed | c326105 | The first Tab shows Skip to content at the top left. Enter moves focus to Home's heading, or to the step heading in a lesson, and the address does not change. |
| 12 | P2 | Log out opens on the clear tick box, and clearing misses lessons | Fixed | 1edbd19 | The dialog opens on Cancel, and Space closes it with nothing ticked. With the box ticked, an `ef-hub-` entry for a lesson not in the library was removed along with the rest, and a key from another app was kept. |
| 13 | P2 | Membership warnings hidden below 900 px | Fixed | 71b1bbf | With the gate stubbed at 375 px: a failed payment and a cancelled plan each show a notice at the top of Home with a link to My account; an active membership shows none. Committed by the main session. |
| 14 | P2 | Download message far from the button | Fixed | 71b1bbf | Each downloadable card has its own message line, 12 px under its button. Seen with the preview's Downloads are switched off message. Committed by the main session. |
| 15 | P2 | Finished notice has no visible box | Already fixed by the alignment | 5484d43 | After Finish in each lesson the notice is sky on the warm white sheet with a 4 px slate edge, and takes focus. |
| 16 | P2 | Failed content load looks like an empty library | Fixed | 71b1bbf | With `courses.json`, `programmes.json` or every lesson file answering 404, Home shows We could not load your library just now with Try again. With `plans.json` at 404, Join shows an error view with Try again. 1 missing lesson of several is still skipped quietly. Committed by the main session. |
| 17 | P2 | Field hints not linked to their fields | Fixed | 44cc313 | Join: a bad password gives `aria-describedby="password-hint err-password"`, and typing restores `password-hint`. Reflect, plan and return fields and the notes box point at their hints. |
| 18 | P2 | Heading order on Home is uneven | Partly fixed | 71b1bbf | Your library is an h2, programmes h3, courses h4, lesson cards h5, resource cards h4 under Resources, and a course that is 1 lesson of the same name shows the card only. Left: Home is still both the h1 in the header and the h2 on the page. Removing either changes the look. Decision: Charlotte. |
| 19 | P2 | Loop shape not described properly | Fixed | 6c043f6 | The svg has `role="group"` and the points use `aria-pressed`. Checked in the page's attributes, not with a screen reader. |
| 20 | P2 | A finished lesson reopens on its last step | Left | | Both suggested fixes change what a learner meets in a lesson: opening at step 1, or a new Start from the beginning button on the summary. Decision: Charlotte and Sarah, which of the 2. |
| 21 | P2 | Long lesson titles cut off on small screens | Fixed | 00c4367 | The Tunnel and the way back shows in full on 2 lines at 375 and 320 px. |
| 22 | P2 | Text sizes fixed in px | Left | | The type tokens are meant to match the Client Hub's generated token file, and a new meaning for Larger is a design choice. Changing them here would undo part of the alignment. Decision: Charlotte, for both apps together. |
| 23 | P2 | Small state and feedback gaps in lessons | Fixed | df6b5c2 | After a pause in typing the hint adds Saved. A plan line shows 32 characters left near its limit and stops at 300. Reflections stop at 10,000. A plan typed just before leaving the step is still saved. The wording is Saved, beside Kept in this browser only, not the audit's Saved on this device. |
| 24 | P3 | Wording drifts between pages | Partly fixed | 3e31cfe | Topics became lessons on the start, join and account pages, to match the viewer. Left: Join the library against Join the Learning Hub, Log in against Signed in, and the privacy statement's the arm you joined through. Decision: Charlotte and Sarah. |
| 25 | P3 | Small keyboard and announcement gaps | Partly fixed | ba28561 | Tab or Shift and Tab out of the account menu closes it. No lessons match is a status message. Titles follow the view on Log in and Join. The privacy link on Join says it opens in a new tab. Left: Open on a resource card still says so to screen readers only, as the visible label would grow too long for the card. |
| 26 | P3 | Drawers flash across the screen at 900 px | Fixed | 43aaebe | Resizing 1440 to 768 px with a 60 ms wait: both columns are already hidden and off screen. The slide still runs when a drawer is opened or closed. |
| 27 | P3 | Password Show button changes label and pressed state | Fixed | ba28561 | The button has no `aria-pressed`. Its name changes between Show password and Hide password, matching the visible word. This is the other valid pattern, chosen because a fixed name would not match the visible Hide. |

## New things noticed

1. Field placeholder text is slate at 75% opacity (`base.css`, `.input::placeholder`), which is about 3.7:1 on warm white. It came in with the alignment, to match the Client Hub, so it was not changed. It is the same kind of failure as finding 2 and should be settled for both apps.
2. On a 320 px screen the viewer header is 148 px tall when the title wraps to 2 lines (it was 127 px). With the Back and Next bar that leaves about 300 px of a 568 px screen for the lesson. Hiding the Executive Frame Learning Hub line above the title on narrow screens would win back about 40 px.
3. The join page shows the same price to everyone. A member on the partner rate would see NZ$29 a month while Stripe charges the partner price. Worth settling before payments open.
4. The privacy statement now names the contact email but is still marked Draft for approval, and `PRIVACY_VERSION` still ends in `-draft`.
5. The contact email is written in 3 places: `SUPPORT.contact` in `layout.js`, the Help dialog in `public/index.html`, and `public/privacy/index.html`.
6. `README.md` still calls lessons topics in its description of the viewer.
7. The class `pulse` on the loading marks has no CSS since the alignment. Nothing pulses, so the audit's note about stopping the pulse no longer applies.
8. If 1 lesson file of several fails to load, that lesson is left out of the library with only a console line. Only a whole library failure shows the new message.
9. The Help dialog used to open on its Close button because it was the only control. With the email link added it would have opened on the link, so Close now carries `autofocus`.

## Not exercised

- Real touch: dragging the loop and sort items with a finger.
- Real screen readers (VoiceOver, NVDA): findings 10, 17, 19, 25 and 27 were checked in the markup only.
- Safari and Firefox: everything was seen in 1 Chromium engine. `inert` (finding 3) needs Safari 15.5 or Firefox 112 or later, and the loop card's container query (finding 5) needs Safari 16 or Firefox 110; older browsers keep the earlier behaviour for focus and a 2 by 2 loop.
- The sort, workshop and download step types: no sample lesson uses them. The scroll change in finding 1 and the status role change in finding 10 touch the code they share.
- The live functions: checkAccess failing for a signed in member, a real past due or cancelled membership, a real download.
