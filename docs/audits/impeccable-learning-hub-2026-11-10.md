# Impeccable audit: Executive Frame Learning Hub

Date: 10 November 2026. Audit only: no app code, content, CSS or docs were changed.

Sections 6 and 7 were added later the same day at Charlotte's request: consistency with the Client Hub, and a component inventory for the shared components guide.

How it was checked: every file in `public/` (pages, CSS, JavaScript, sample content) was read, then the local preview was walked on port 5057 at 1920, 1440, 1280, 1024, 768, 375 and 320 px wide, plus a 740 by 360 landscape phone. Contrast was measured on the rendered page, including opacity. `npm run contrast` and the Impeccable detector were both run.

## 1. Summary

1. The app is calm, consistent and clearly built with care: 1 token file, plain language, real focus handling on the join and login forms, and privacy copy at every place a learner types.
2. The lesson screen has 1 layout fault that hurts every lesson at every width: the Back and Next bar floats 64 px above the bottom and sits on top of the lesson text. On a phone it covers the scenario feedback the learner has just asked for.
3. Accessibility is partly there, not yet WCAG 2.1 AA: secondary text is dimmed with opacity and falls below 4.5:1 in about 12 places (the 1737 crisis line included), hidden side columns stay in the keyboard tab order, and 2 focus rings cannot be seen.
4. Home has 1 visible break: the 4 loop boxes spill out of their card at 1024, 1280 and 768 px wide. The new Resources section itself holds up at every width.
5. Score 13 out of 20 (Acceptable). 27 findings: 0 P0, 8 P1, 15 P2, 4 P3. Most P1 items are small CSS or JavaScript fixes, and 3 of them are 1 line each.

### Health score

| # | Dimension | Score | Key finding |
| --- | --- | --- | --- |
| 1 | Accessibility | 2 | Dimmed text below 4.5:1, hidden columns in the tab order, 2 invisible focus rings |
| 2 | Performance | 3 | Light: no framework, 280 KB Firebase SDK, 68 KB fonts. Nothing measured as slow |
| 3 | Theming | 3 | Tokens used well. Some hard coded whites and rgba values. Light theme only, by design |
| 4 | Responsive design | 2 | Lesson controls cover content, loop card overflows, 320 px overflows sideways |
| 5 | Implementation integrity | 3 | Coherent and specific to this product. Placeholders still visible to members |
| | Total | 13/20 | Acceptable: significant work needed before launch |

### Implementation integrity verdict

Pass. The interface reads as 1 product with its own voice, not a template. Detector results, checked by hand:

- Low contrast text, 4.2:1 on the panel: real. It is finding 2.
- "Glowing shadow" on `index.html`: false positive. These are the drawer shadow and the selected card ring.
- "Cramped padding" on `.seg`: false positive. It is a segmented control, and the labels have 16 px padding.
- "Account menu clipped by the library column": not a fault in practice. The menu opens upwards inside the column and fits.

## 2. Findings, most severe first

Severity: P0 blocks a task. P1 is a major difficulty or a WCAG AA failure, fix before release. P2 is an annoyance with a workaround. P3 is polish.

### P1

**1. The Back and Next bar covers the lesson text**

- Screen: every lesson step, all widths. Worst on a phone, in landscape, and on scenario, check and frame steps.
- What is wrong: the bar sticks 64 px above the bottom of the stage, not at the bottom. Lesson text shows above it, behind it and below it. Measured: bar bottom at 748 px in an 812 px phone screen, and at 736 px in an 800 px desktop window. On a 740 by 360 landscape phone the bar cuts through the step heading and leaves a 141 px reading band. On a phone, choosing a scenario response puts the feedback behind the bar (feedback at 656 to 812 px, bar at 664 to 748 px).
- A second cause makes it worse: every re-render scrolls the stage to the top, then focus pulls it back down, so the page jumps each time a response is chosen (300 px to 0 to 131 px in the test).
- Why it matters: the learner cannot read the answer they just asked for without hunting for it. For someone under pressure this is the moment the lesson is for.
- Where: `public/assets/css/base.css:61` (the shared `main` rule gives the viewer's scrolling `main` 64 px of bottom padding, and 32 to 48 px at the top, which the sticky bar honours). `public/assets/css/viewer.css:71` (sticky bar). `public/assets/js/viewer.js:356` (scroll to top on every `onStep`, including re-renders from `player.js:237` and `player.js:348`).
- Fix: set `padding: 0` on `.stage-wrap`. Give the step panel bottom padding equal to the bar height so the last lines can scroll clear. Only reset the scroll position when the step number changes, not on a re-render. After a scenario choice, scroll the feedback into view above the bar.
- Suggested command: `/impeccable layout`

**2. Secondary text is dimmed with opacity and fails contrast**

- Screen: Home, the library column, every lesson, the notes column, login, join, account, thank you.
- What is wrong: the palette passes (5.21:1 and 6.65:1), but opacity is then applied on top. Measured on the page:
  - `.loop-seg[data-state="soon"]` ("Clarify, Coming soon"): 2.68:1
  - `.chead .t-caption` ("Foundation", "Tool") and `.stepbtn.unseen`: 3.36:1
  - `.muted` on the sky ground (course summaries on Home): 3.52:1
  - `.placeholder` inside muted text: 3.78:1
  - `.lesson-foot` (the 1737 crisis line under every lesson, 14 px): about 3.9:1
  - `.muted`, `.dash-h` and `.beat` on the panel: 4.18:1
  - `.vtop-sub` (the membership status line): 4.27:1
- Why it matters: this is the small print a tired reader most needs to be easy: the crisis line, "Kept in this browser only", the step list, the plan summary. `npm run contrast` cannot see it because it only checks solid token pairs.
- Where: `public/assets/css/base.css:109`, `public/assets/css/hub.css:7`, `:14`, `:99`, `:123`, `public/assets/css/viewer.css:18`, `:20`, `:42`, `:46`, `:51`.
- Fix: remove opacity from text. Use full strength ink for anything a learner needs, and show hierarchy with size and weight. If a quieter tone is wanted, add 1 solid token (for example `--ink-soft`) that passes 4.5:1 on both the ground and the panel, and add it to `scripts/check-contrast.mjs`. The crisis line should be full strength.
- Suggested command: `/impeccable colorize`

**3. Hidden side columns stay in the keyboard tab order, and opening a drawer does not move focus**

- Screen: viewer below 900 px wide (phones, tablets, and a desktop browser zoomed to 200%), and desktop with a column folded.
- What is wrong: closed drawers are only slid off screen, and folded columns are only set to 0 width. Their controls can still be tabbed to. Measured at 768 px on Home: 12 invisible tab stops (10 in the library, 2 in the reader). Desktop with both columns folded in a lesson: 28 invisible stops. When a drawer opens, focus stays on the header button, because the first match is the hidden fold button, so `focus()` does nothing. Focus is not kept inside the open drawer, and the page behind is still reachable.
- Why it matters: a keyboard user loses the focus ring for a dozen presses and cannot tell where they are. A screen reader user reads a drawer that is meant to be closed.
- Where: `public/assets/css/viewer.css:93` to `:96` and `:130` to `:133` (hidden by width and transform only). `public/assets/js/viewer.js:201` (focus target), `:196` to `:207` (no containment, no `inert`).
- Fix: set `inert` (or `visibility: hidden` after the transition) on a column when it is folded or its drawer is closed. On open, focus the close button or the column heading. While a drawer is open, set `inert` on the stage and the other column, and return focus to the opener on close (this part already works for Escape and the close button).
- Suggested command: `/impeccable harden`

**4. 2 focus rings cannot be seen**

- Screen: Viewer settings dialog, and the loop (frame) step.
- What is wrong: (a) in settings, the ring on a selected option is 2 px slate drawn inside navy, about 1.4:1. The dialog opens with focus on a selected option, so the first thing a keyboard user meets is an invisible focus. (b) On the loop, the focused point is shown only by its outline growing from 2 px to 4 px in the same colour. On the selected point (filled slate) there is no visible change at all.
- Why it matters: keyboard users cannot see where they are in 2 controls the Help text tells them to use.
- Where: `public/assets/css/viewer.css:114`. `public/assets/css/hub.css:70` to `:71` (and `:68` for the selected fill).
- Fix: (a) draw the ring outside the segmented control with a positive offset, or use a warm white ring on the selected segment. (b) add a separate focus ring circle around the point (radius 46, 2 px, with a gap), so it shows on both filled and unfilled points.
- Suggested command: `/impeccable polish`

**5. The loop card overflows on Home**

- Screen: Home, "Where you are in the loop", at 1280 px (spills 78 px), 1024 px (32 px) and 768 px (12 px). Fine at 1440, 1920 and 375 px.
- What is wrong: the 4 boxes will not shrink below the width of "Coming soon", so the last box ("Return") runs out of its card and over the "This week's practice" card beside it.
- Why it matters: 1280 px is the most common laptop width. The first screen after login looks broken, on the card that explains the method.
- Where: `public/assets/css/hub.css:10` (`repeat(4, 1fr)`) and `:16` (the 2 column fallback only applies under 480 px of window width, not card width).
- Fix: use `repeat(auto-fit, minmax(96px, 1fr))` so the boxes wrap to 2 by 2 whenever the card is narrow, or `repeat(4, minmax(0, 1fr))` with shorter state labels.
- Suggested command: `/impeccable layout`

**6. At 320 px wide the lesson overflows sideways**

- Screen: any lesson at 320 px, which is also what a 1280 px desktop shows at 400% zoom.
- What is wrong: Back and Next each have a 132 px minimum width, so with the step counter they need more than the 272 px available. The page scrolls sideways and Next is cut off at the edge. The header also takes 127 px of a 568 px screen. At 375 px it fits, but the counter is squeezed to 39 px and wraps to 3 lines ("Step / 10 of / 10").
- Why it matters: people who zoom to read cannot reach Next without scrolling in 2 directions.
- Where: `public/assets/css/hub.css:52` and `:53`.
- Fix: drop the minimum width below 480 px and let the buttons share the row (`flex: 1`), with the counter on its own line above them, or inside the progress bar row.
- Suggested command: `/impeccable adapt`

**7. If the membership check fails, the viewer shows "Checking your membership" for ever**

- Screen: viewer cover, live site only (read from code, not reproduced: the preview never takes this path).
- What is wrong: `requireMember` rethrows any `checkAccess` error, and `viewer.js` awaits it at the top level with no catch. The cover stays up, pulsing, with no message and no way to retry. The start page and the account page both handle the same failure well.
- Why it matters: a member on a poor connection sees an endless loading screen and cannot tell whether to wait.
- Where: `public/assets/js/gate.js:28`, `public/assets/js/viewer.js:17`.
- Fix: catch the error in the viewer and swap the cover text for "We could not check your membership just now. Nothing has changed." with a Try again button and a link to My account. Stop the pulse.
- Suggested command: `/impeccable harden`

**8. Placeholders a member can see**

- Screen: Home support card, Help dialog, the check step's support line, privacy statement, join step 3.
- What is wrong: "contact email to be confirmed" appears in 4 places where a learner is told to get in touch. The privacy statement is marked "Draft for approval" and its "Your rights" section has no contact. Plan prices show "NZ$XX".
- Why it matters: the check step sends a struggling learner to a contact that does not exist. A privacy statement must say how to reach the practice. These are known gaps, listed here so they are not missed at launch.
- Where: `public/assets/js/layout.js:14`, `public/index.html:146`, `public/privacy/index.html:60` (and the draft marker near line 21), `public/content/plans.json`, `public/assets/js/app.js:76` (`PRIVACY_VERSION` ends in `-draft`).
- Fix: Sarah confirms the contact email, prices and privacy wording. Make the email a `mailto:` link. Add a line to the launch checklist: no element with class `placeholder` on any page.
- Suggested command: `/impeccable clarify`

### P2

**9. On a phone, the loop step changes its text off screen**

- Screen: frame step at 375 px.
- What is wrong: the shape fills the screen and the panel that explains each point sits below it, under the Back and Next bar. Pressing Next turns the shape, but the words that changed are out of view. The whole 280 px shape also has `touch-action: none`, so a swipe that starts on it does not scroll the page. Sort items have the same rule and are full width.
- Why it matters: the learner sees a shape turn and misses the content. On a small phone the shape can trap the scroll.
- Where: `public/assets/css/hub.css:56` to `:58`, `:90`. `public/assets/js/player.js:290`.
- Fix: on narrow screens put the point's panel above the shape, or shrink the shape to about 200 px. Use `touch-action: pan-y` so vertical swipes still scroll. Touch dragging was not exercised with a real finger: see section 4.

**10. Screen readers hear each step 2 or 3 times**

- Screen: every lesson step.
- What is wrong: the whole step panel is `aria-live="polite"`, focus is also moved to the step heading, and the step counter is a second live region. Scenario feedback adds `role="status"` inside the live panel and takes focus as well.
- Why it matters: a screen reader user gets the full step read out on top of the heading announcement, every time, and again after each choice.
- Where: `public/index.html:97`, `:100`. `public/assets/js/player.js:106`, `:120`, `:422`.
- Fix: remove `aria-live` from `#stage` and `#count`. Moving focus to the heading is enough. Keep `role="status"` on the feedback and do not move focus to it, or keep the focus move and drop the role.

**11. No skip link in the viewer**

- Screen: viewer on desktop.
- What is wrong: the other pages have "Skip to content". The viewer does not, and the library column comes first with up to 22 tab stops before the lesson.
- Where: `public/index.html:26` (compare `public/assets/js/layout.js:45`).
- Fix: add the same skip link, pointing at `#main`, as the first element in the page.

**12. The log out dialog opens on the "clear my notes" tick box, and clearing misses some lessons**

- Screen: Log out and exit dialog.
- What is wrong: first focus lands on "Also clear my place, notes and reflections". 1 press of Space ticks it. Separately, clearing only removes lessons in the current catalogue, so notes from a lesson that has since been unpublished stay on a shared computer.
- Why it matters: 1 path loses a learner's writing by accident. The other leaves private writing behind when they asked for it to go.
- Where: `public/index.html:177` to `:184`. `public/assets/js/viewer.js:464`.
- Fix: put `autofocus` on Cancel, or focus the dialog heading. When clearing, remove every `localStorage` key that starts with `ef-hub-`.

**13. Membership warnings are hidden below 900 px**

- Screen: viewer header on phones and tablets.
- What is wrong: the status line under the title ("Your last payment did not go through", "Your free trial runs until") is hidden on small screens. It then only appears inside the closed notes drawer on Home.
- Where: `public/assets/css/viewer.css:128`. `public/assets/js/viewer.js:264`.
- Fix: for `past_due` and a cancelled plan, show a notice at the top of Home at every width, with a link to My account.

**14. The resource download message is far from the button**

- Screen: Home, Resources.
- What is wrong: all cards share 1 message line under the whole grid. On a phone, "Preparing your download" or an error appears below the last card, possibly off screen, and does not say which file.
- Where: `public/assets/js/viewer.js:309`, `:327`.
- Fix: give each card its own status line under its button, or name the file in the message.

**15. The "You have finished" notice has no visible box**

- Screen: Home after finishing a lesson.
- What is wrong: the notice uses the sky ground colour as its background, and it sits on the sky ground. It reads as indented text with stray padding.
- Where: `public/assets/css/base.css:193`, `public/index.html:88`.
- Fix: use the panel colour for a notice on the ground, or give it a 2 px slate left edge and a tick.

**16. A failed content load looks like an empty library**

- Screen: Home and Join.
- What is wrong: if the course or lesson files fail to load, Home says "New lessons are on their way. Please check back soon." If `arms.json` or `plans.json` fails on Join, the page stays on "Getting things ready" for ever.
- Where: `public/assets/js/viewer.js:31`, `:312`. `public/assets/js/join.js:30` to `:33`.
- Fix: tell "nothing published" apart from "could not load", and show "We could not load your library just now" with Try again.

**17. Field hints are not linked to their fields**

- Screen: join (password rule, work email hint), reflect and plan steps ("Kept in this browser only").
- What is wrong: hints are plain spans with no `aria-describedby`. When an error appears it replaces any description, so the password rule is never read with the field.
- Where: `public/join/index.html:78`, `:86`. `public/assets/js/ui.js:29`. `public/assets/js/player.js:96`, `:132`, `:143`.
- Fix: give each hint an id and list it in `aria-describedby`. In `fieldError`, append the error id to the existing value, and restore the hint id on clear.

**18. Heading order on Home is uneven**

- Screen: Home.
- What is wrong: "Home" is both the h1 in the header and the h2 on the page. "Your library" is an h3 and so are the programmes under it. Lesson cards are h5 under an h4, but resource cards are h4. In Tools, "Centre in 90 seconds" appears as a course h4 and again as the lesson h5 directly below.
- Where: `public/assets/js/viewer.js:275`, `:282`, `:295`, `:297`, `:304`, `:311`. `public/index.html:33`, `:86`.
- Fix: make "Your library" an h2 (a sibling of the dashboard), programmes h3, courses h4, cards h5 throughout. When a course holds 1 lesson with the same title, show the card only.

**19. The loop shape is not described properly to assistive technology**

- Screen: frame step.
- What is wrong: the svg has an `aria-label` but no role, so the label may be ignored. The points are `role="button"` with `aria-current`, where `aria-pressed` is the fitting state.
- Where: `public/assets/js/player.js:171`, `:176`, `:288`.
- Fix: add `role="group"` to the svg. Use `aria-pressed` on the points.

**20. A finished lesson reopens on its last step**

- Screen: opening a finished lesson from Home or the library.
- What is wrong: it opens on the summary with a Finish button. There is no "Start again". On a phone the step list is inside the closed drawer, so the only visible route back is pressing Back up to 9 times.
- Where: `public/assets/js/viewer.js:364`, `public/assets/js/player.js:28`.
- Fix: open a finished lesson at step 1, or offer "Start from the beginning" on the summary step.

**21. Long lesson titles are cut off on small screens**

- Screen: viewer header below 900 px.
- What is wrong: the h1 is 1 line with an ellipsis ("The Tunnel and the w...") and the summary line is hidden, so the full title is not shown anywhere until the intro step.
- Where: `public/assets/css/viewer.css:19`, `:127` to `:128`.
- Fix: allow the title to wrap to 2 lines on small screens.

**22. Text sizes are fixed in px**

- Screen: whole app.
- What is wrong: every size is in px, so a larger default font set in the browser is ignored. Zoom still works, so this is not a WCAG failure. The "Larger" setting adds 2 px to body text only, leaves headings and buttons alone, and applies only in the viewer.
- Where: `public/assets/css/tokens.css:92` to `:97`. `public/assets/css/viewer.css:118`.
- Fix: express the type tokens in rem. Make "Larger" a clear step (about 125%) across all text roles, and load `settings-early.js` on the account, login and join pages too.

**23. Small state and feedback gaps in lessons**

- Screen: reflect, plan and return steps.
- What is wrong: writing saves silently after 300 ms, with nothing to confirm it. Plan fields cut off at 300 characters and reflections at 10,000 with no notice.
- Where: `public/assets/js/player.js:225`, `:129` to `:131`, `:246`.
- Fix: show a quiet "Saved on this device" beside the privacy hint after each save. Show a character count when a plan field is within 40 characters of its limit.

### P3

**24. Wording drifts between pages.** "Topics" (start, join, account) against "lessons" (viewer). "Join the library" against "Join the Learning Hub". "Log in" against "Signed in" and "Signing you in". The privacy statement says "the arm you joined through", which is internal language. Where: `public/start/index.html:40`, `public/join/index.html:34` to `:35`, `:101`, `public/account/index.html:49`, `public/assets/js/account.js:83`. Fix: pick 1 word for each and apply it everywhere. Suggested command: `/impeccable clarify`.

**25. Small keyboard and announcement gaps.** The account menu stays open when focus tabs away from it (`viewer.js:432`). "No lessons match" is not announced (`index.html:59`, add `role="status"`). The page title does not change between Log in and Reset your password, or between join steps. Links that open a new tab (privacy statement on join, "Open" on a resource card) say so only to screen readers.

**26. The drawers flash across the screen when the window crosses 900 px.** Both columns slide over the page for a moment on resize or tablet rotation, because the transform is animated. Where: `public/assets/css/viewer.css:130`. Fix: only apply the transition while a drawer is being opened or closed.

**27. The password Show button changes both its label and `aria-pressed`.** A screen reader hears "Hide password, pressed". Where: `public/assets/js/login.js:48` to `:50`, `public/assets/js/join.js:123` to `:125`. Fix: keep the label "Show password" and toggle `aria-pressed` only.

### Patterns behind the findings

- Opacity is used as the "quiet text" tool in 10 rules. That 1 habit causes all of finding 2.
- "Hidden" means off screen or 0 width, not removed from focus. That causes finding 3.
- The CSS says "values come from tokens.css only", but `#FFFFFF`, `#F3E7E4`, `rgba(207, 218, 232, ...)` and `rgba(46, 64, 98, ...)` are written directly in `base.css`, `hub.css` and `viewer.css`. Worth 3 or 4 more tokens (`--field`, `--panel-hover`, `--shadow`, `--error-ground`).
- Shared rules in `base.css` (`main`, `.notice`) reach into the viewer, which has a different layout. That causes findings 1 and 15.

### What is working well

- 1 token file, 1 font, a clear type scale, and a contrast script in the build.
- Focus moves to the new heading on every step and every view change. Dialogs are native `dialog` elements: Escape closes them and focus returns to the opener.
- Form errors are specific, sit under the field, are linked with `aria-describedby` and take focus. Login does not reveal whether an address has an account.
- Every interactive target in the stage is at least 44 px. No sideways scroll at 375, 768, 1024, 1280, 1440 or 1920 px.
- Reduced motion is respected through the motion tokens, and the viewer adds its own "Keep it still" setting.
- Privacy is stated where the learner writes, every time. The suitability check never blocks. The scenario says plainly that nothing is scored.
- The start page handles a failed membership check gracefully, and never puts "client" in an address.
- Sort and scenario choices show their state in words as well as colour.

## 3. Accessibility against WCAG 2.1 AA

Not yet conformant. Failures and risks, by success criterion:

| Criterion | Level | Status | Finding | Detail |
| --- | --- | --- | --- | --- |
| 1.4.3 Contrast (minimum) | AA | Fails | 2 | Dimmed text from 2.68:1 to 4.27:1, including the crisis line |
| 2.4.7 Focus visible | AA | Fails | 3, 4 | Focus goes into hidden columns. Ring invisible on selected settings option and selected loop point |
| 2.4.3 Focus order | A | Fails | 3 | 12 to 28 hidden tab stops. Drawer opens without taking focus |
| 1.4.10 Reflow | AA | Fails | 6 | Sideways scroll at 320 px in lessons |
| 1.4.11 Non-text contrast | AA | Fails | 4 | Focus indicator on settings is about 1.4:1 against the selected segment |
| 4.1.3 Status messages | AA | At risk | 10, 25 | Steps announced more than once. "No lessons match" not announced |
| 1.3.1 Info and relationships | A | At risk | 17, 18, 19 | Hints not linked to fields. Uneven heading order. Loop svg has a label but no role |
| 3.3.2 Labels or instructions | A | At risk | 17 | Password rule is visible but not read with the field |
| 4.1.2 Name, role, value | A | At risk | 19, 27 | `aria-current` on buttons. Show button changes label and pressed state together |
| 2.4.1 Bypass blocks | A | Passes narrowly | 11 | Landmarks exist, but there is no skip link in the viewer |
| 2.4.2 Page titled | A | Passes, minor gap | 25 | Title does not change between views on login and join |
| 1.4.4 Resize text | AA | Passes | 22 | Zoom works. Browser font size setting is ignored |
| 2.1.1 Keyboard | A | Passes | | Loop, scenario and settings all work from the keyboard. Sort has a select then place route in code (not rendered: see section 4) |
| 2.1.2 No keyboard trap | A | Passes | | None found |
| 2.3.3 and reduced motion | | Passes | | Tokens go to 0 ms. The loading pulse stops under the system setting, but not under the viewer's own "Keep it still" |
| 2.5.5 and target size | | Passes | | Stage targets are 44 px or more. Step list buttons are 36 px high, above the 24 px AA floor in WCAG 2.2 |
| 1.4.1 Use of colour | A | Passes | | States carry text or a tick as well as colour |
| 3.3.1 Error identification | A | Passes | | Errors are in text, by the field, and take focus |

Also worth knowing: with focus resting on a control behind the sticky bar (finding 1), WCAG 2.2 criterion 2.4.11 Focus not obscured would fail. It is not part of 2.1.

## 4. What could not be checked, and why

- Signed in states: the account page, trial, past due, cancelled, organisation and ended memberships. The preview has no sign in, and `/account/` redirects to login. Read from code only.
- The sort, workshop and download step types. None of the 3 sample lessons uses them, so they were read in `player.js` but never rendered. The sort drag, its keyboard route and its phone layout are untested.
- Stripe Checkout, the billing portal, real downloads, the trial download limit, and email links. Out of reach by design in the preview.
- Live content from Notion: long titles, long summaries, many lessons in 1 course, many resource cards. Only the sample content was seen.
- Real touch. Phone and tablet were emulated viewports. Dragging the loop and any swipe behaviour were not exercised with synthesised or real touch, so finding 9's scroll trap is from the CSS, not from a finger.
- Real screen readers (VoiceOver, NVDA). Findings 10, 17 and 19 come from the markup and the accessibility tree, not from listening.
- Safari and Firefox. Everything was seen in 1 Chromium engine. The sticky bar gap in finding 1 should be confirmed in Safari on an iPhone, where the 64 px may differ.
- The live site's headers and speed. The local server sends no Content Security Policy and no caching, so load time, font swap and CSP behaviour were not measured.
- Finding 7 (endless membership check) was not reproduced, because the preview skips that branch. It is from reading `gate.js` and `viewer.js`.
- Screenshots in the preview pane lagged by 1 state and were cropped at 1440 px and wider, so every measurement in this report comes from the page's own geometry, not from the pictures.
- Print, and Windows high contrast mode.

## 5. The 5 fixes to do first

1. Stop the Back and Next bar covering the lesson: `padding: 0` on `.stage-wrap`, bottom padding on the step, and no scroll reset on re-render (finding 1). About 5 lines.
2. Replace opacity on text with a solid colour that passes, starting with the crisis line, and add the new pair to the contrast script (finding 2).
3. Make hidden columns truly hidden with `inert`, and move focus into a drawer when it opens (finding 3).
4. Fix the loop card overflow on Home and the lesson controls at narrow widths (findings 5 and 6). 2 CSS rules.
5. Make the 2 invisible focus rings visible, and catch a failed membership check with a message and Try again (findings 4 and 7).

Then, before launch: confirm the contact email, prices and privacy statement (finding 8).

Suggested order of Impeccable commands: `/impeccable layout` (1, 5), `/impeccable colorize` (2), `/impeccable harden` (3, 7, 12, 16), `/impeccable adapt` (6, 9, 21), `/impeccable clarify` (8, 24), then `/impeccable polish` last. Run `/impeccable audit` again afterwards to see the score move.

## 6. Consistency with the Client Hub

Added at Charlotte's request: the 2 apps should look alike. The Client Hub was compared from its source only (`DESIGN.md`, `docs/brand-notes.md`, `public/css/tokens.css`, `public/css/app.css`, `public/css/components.css`, `public/styleguide.html` in `/Users/charlotteberry/efclienthub`). It was not rendered here, nothing there was edited, and a sibling session is auditing it. Paths starting `public/css/` are the Client Hub. Paths starting `public/assets/css/` are the Learning Hub.

### The short version

- The raw materials match: the same 4 palette colours, the same Figtree files, the same type sizes, the same spacing scale, the same radius values, the same 180 ms motion.
- The way they are used does not match. A person who moves between the 2 apps with 1 login will notice different button shapes, lighter text, white fields, shadows, and a sidebar in the opposite colour.
- The Client Hub has a written system (`DESIGN.md`) and a generated token file. The Learning Hub has a hand written token file with different names. `docs/brand-notes.md` in the Client Hub says the same script and the same `tokens.json` should produce an identical file in the Learning Hub. That has not happened yet.
- Recommendation: treat the Client Hub's `tokens.css` and `DESIGN.md` rules as the base for the shared guide, and bring across from the Learning Hub the pieces the Client Hub does not have (the lesson player, the segmented control, the viewer settings, the tag).

### Differences, ranked by how visible they are to a person using both apps

| Rank | What | Verdict | Learning Hub | Client Hub | Keep, and why |
| --- | --- | --- | --- | --- | --- |
| 1 | Button shape and fill | Differ clearly | `.btn`: pill (`--radius-pill`), 2 px slate border, transparent fill, width auto. Hover fills with `--hairline`. Pressed moves 1 px. `public/assets/css/base.css:112` to `:127` | `.btn`: 12 px (`--radius-md`), 2 px transparent border, full width by default. `.btn-secondary` is warm paper with a slate border, hover `#FFFFFF`. `public/css/app.css:549` to `:616` | Client Hub. Its radius roles are written down (pill is for status only), and a filled secondary button reads as a button on both sky and paper. Keep the Learning Hub's `.btn-block` and `.btn-row` ideas as `.btn-inline` and `.actions` |
| 2 | Body text weight | Differ clearly | 300 by default: `--body-weight: var(--weight-light)`. Regular is a viewer setting. `public/assets/css/tokens.css:87`, `public/assets/css/viewer.css:117` | 400 by default, 300 is opt in with `data-weight="light"`. `public/css/app.css:11` to `:12`, `:31` to `:34` | Client Hub. 400 is easier to read, and thin text makes the contrast failures in finding 2 worse. Keep the Learning Hub's settings dialog, with Regular as the default |
| 3 | Sidebar and surface colours | Differ clearly | Side columns are warm paper, the stage is sky, cards are paper on sky. Current nav item is filled sky. `public/assets/css/viewer.css:30`, `:39`, `:68`, `:79` | Sidebar and top bar are sky, the workspace is a warm paper sheet, panels are sky on paper. Current nav item is filled paper. `public/css/app.css:186`, `:252`, `:345` to `:353`, `:370` to `:374` | Client Hub. "Sky room, paper desk" is its named idea, and it gives long reading a paper ground. The Learning Hub's 3 column layout can stay, in those colours |
| 4 | Form fields | Differ clearly | White fill (`#FFFFFF`), 12 px corners, 16 px text, no vertical padding. `public/assets/css/base.css:136` to `:141` | Warm paper fill (`--panel`), 8 px corners (`--radius-sm`), 17 px body text, 12 px by 16 px padding, placeholder at 75%. `public/css/app.css:639` to `:689` | Client Hub. White is a 5th colour that its Four Colour Rule excludes, and 8 px is the field radius in its scale |
| 5 | Shadows | Differ clearly | Shadows on the account menu, dialogs, drawers and the drag ghost. `public/assets/css/viewer.css:64`, `:102`, `:130`, `public/assets/css/hub.css:94` | None: "The No Shadow Rule". Depth by tone and hairline. Drawer dims the page with a navy spread. `DESIGN.md:276` to `:285`, `public/css/app.css:461` | Client Hub. The drag ghost in the sort step may keep a shadow, as it is a moving object, not a surface |
| 6 | Status and tags | Differ clearly | `.tag`: 28 px sky pill, word only ("Not started", "Finished", "Tool"). `public/assets/css/hub.css:41` | `.status`: 28 px pill, 16 px icon plus word, 3 tinted variants (`.status-done`, `.status-progress`, `.status-attention`). `public/css/app.css:792` to `:824` | Both. Use `.status` for progress ("Finished" is done, "Step 3 of 10" is in progress). Keep `.tag` as the neutral label for kinds ("Tool", "Workbook", "Sample content") |
| 7 | Notices | Differ clearly | `.notice`: sky fill, no edge. `.notice-error`: pink fill `#F3E7E4`, brick text. `public/assets/css/base.css:193` to `:194` | `.notice`: 4 px slate left edge, paper on sky or sky on paper. `.notice-error`: brick edge only. `public/css/app.css:1133` to `:1145`, `:370` to `:374` | Client Hub. The edge makes a notice visible on any ground, which also fixes finding 15 |
| 8 | Choice cards and radios | Differ clearly | `.choice-body`: white, 2 px hairline border, no dot. Selected: slate border and a 1 px inset ring. `public/assets/css/base.css:157` to `:170`. Also `.seg`, a navy filled segmented control: `public/assets/css/viewer.css:108` to `:114` | `.choice`: paper, 2 px slate border, 22 px ring with a navy dot, optional `kbd` hint. Selected: sky fill, navy border. `public/css/app.css:731` to `:788` | Client Hub `.choice` for single choices. Keep `.seg` as a new shared component for 2 to 3 short options: the Client Hub has nothing like it |
| 9 | Headings and labels | Differ clearly | Display at weight 300, tracking -0.01em. Title has no tracking. Headings only style through classes. Uppercase tracked labels: `.dash-h`, `.beat`. `public/assets/css/base.css:23` to `:25`, `public/assets/css/hub.css:7`, `:99` | Display at 400, -0.02em. Title -0.01em. `h1`, `h2`, `h3` carry the type roles by default. "No uppercase labels" is a written rule. `public/css/app.css:121` to `:152`, `DESIGN.md:356` | Client Hub. Replace the uppercase labels with UI strong or caption in sentence case |
| 10 | Navigation pieces | Differ clearly | `.navbtn`: 22 px icons at 1.8 stroke, hover sky at 55%. Avatar is a sky disc with a slate letter, in an account button at the foot of the sidebar with a pop up menu. Menu button is a 44 px circle with a 2 px slate border. `public/assets/css/viewer.css:22` to `:23`, `:37` to `:39`, `:56` to `:65` | `.nav-link`: 20 px icons at 1.5 stroke (`--icon-stroke`), hover paper at 55%. Avatar is a navy disc with a paper letter, in an account button at the right of the top bar. Menu button has no border, 12 px corners. `public/css/app.css:228` to `:256`, `:308` to `:341`, `:472` to `:484` | Client Hub for icon size, stroke, avatar and menu button. Decide once where the account button lives (top bar right is the more common place) and use it in both |
| 11 | Brand mark and wordmark | Differ clearly | Placeholder drawings: "Every SVG in this folder is a placeholder". Mark at 36 px, wordmark at 16 px with "Learning Hub" at weight 300. Draws on. `public/assets/brand/README.md`, `public/assets/css/base.css:68` to `:72` | The supplied mark files. Mark at 32 px, wordmark at 20 px, weight 500 (`--type-wordmark-*`). Draws on. `public/css/app.css:196` to `:217`, `:1079` to `:1097` | Client Hub. Copy its mark and lockup files into the Learning Hub, and use the wordmark token |
| 12 | Field errors and messages | Differ slightly | `.field-err`: 14 px, weight 500, no badge. Hook is `aria-invalid="true"` on the input. Form level `.msg`. `public/assets/css/base.css:143`, `:147` to `:150` | `.field-error`: 16 px, with a 20 px round "!" badge. Hook is `.field-invalid` on the wrapper. `public/css/app.css:691` to `:720` | Client Hub look (the badge means the error is not colour alone). Learning Hub hook (`aria-invalid` is the accessible one). Keep `.msg` for form level messages |
| 13 | Links | Differ slightly | Underline in the text colour, 1 px, 2 px on hover. `public/assets/css/base.css:33` to `:34` | Underline at 40% (`--underline`), full ink on hover. Quiet buttons are underlined too. `public/css/app.css:72` to `:81`, `:595` to `:605` | Client Hub. It needs the `--underline` token, which the Learning Hub does not have |
| 14 | Dialogs | Differ slightly | `dialog.vdialog`: 560 px, 32 px padding, 16 px corners, shadow, backdrop navy at 35%. `public/assets/css/viewer.css:102` to `:106` | `.dialog`: 480 px, 32 px padding, 16 px corners, no shadow, backdrop navy at 45%. `public/css/components.css:218` to `:229` | Client Hub values, with the Learning Hub's 80vh scrolling inner wrapper |
| 15 | Focus ring | Differ slightly | 2 px slate, offset 3 px, forces an 8 px radius, and removes the outline on plain `:focus`. Navy on primary buttons. `public/assets/css/base.css:37` to `:39` | 2 px slate, offset 2 px. Navy on primary buttons. `public/css/app.css:83` to `:86`, `:581` to `:583` | Client Hub. Simpler, and it does not strip `:focus` |
| 16 | Drawer | Differ slightly | 320 px or 86vw, separate `.scrim` at navy 35%, shadow, hidden by transform only. `public/assets/css/viewer.css:129` to `:134` | 320 px or 86vw, navy 35% dimmer, no shadow, `visibility: hidden` when closed. `public/css/app.css:455` to `:470` | Client Hub. Its closed drawer leaves the tab order, which is the fix for finding 3 |
| 17 | Loading state | Differ slightly | `.loading` with a pulsing mark at 56 px. `public/assets/css/base.css:197` to `:201` | `.loader` with the mark drawing on at 72 px. `public/css/app.css:1099` to `:1113` | Client Hub. 1 loading pattern, and no pulse |
| 18 | Tick boxes | Differ slightly | `.check input`: 22 px, `accent-color: var(--slate)`. `public/assets/css/base.css:151` to `:152` | `.check input`: 22 px, `accent-color: var(--ef-navy)`. `public/css/components.css:40` to `:54` | Client Hub navy, to match the checked radio dot |
| 19 | Panels and cards | Match, small difference | `.panel`: paper, 16 px corners, 24 px padding, 32 px from 768 px. `public/assets/css/base.css:99` to `:106` | `.panel`: paper, 16 px corners, 24 px padding. Also `.panel-accent`, `.panel-inverted`. `public/css/app.css:524` to `:538` | Client Hub (24 px throughout) |
| 20 | Progress bar | Match | `.hub-progress`: 6 px, hairline track, ink fill. `public/assets/css/hub.css:46` to `:47` | `.progress`: 6 px, hairline track, accent fill (ink by default). `public/css/app.css:1062` to `:1075` | Same component. Use 1 class name: `.progress` |
| 21 | Disabled state | Match | 55% opacity, `pointer-events: none`. `public/assets/css/base.css:123` | 55% opacity, `cursor: not-allowed`. `public/css/app.css:607` to `:611` | Either |
| 22 | Skip link, `.visually-hidden`, `.stack` | Match | `public/assets/css/base.css:41` to `:46`, `:107` | `public/css/app.css:92` to `:117`, `:381` to `:387` | Same. Note `.stack-lg` is 24 px here and 32 px in the Client Hub: keep 32 px |

### Tokens, name by name

Values match unless the table says otherwise. The names are the problem: a shared component cannot be written until 1 set is chosen. Keep the Client Hub names, because its file is generated from `brand/tokens.json`.

| Role | Learning Hub (`public/assets/css/tokens.css`) | Client Hub (`public/css/tokens.css`, `public/css/app.css`) | Verdict |
| --- | --- | --- | --- |
| Palette | `--navy` `#2E4062` (`:58`), `--slate` `#3E5680` (`:59`), `--sky` `#CFDAE8` (`:60`), `--warm-white` `#F5F3EE` (`:61`) | `--ef-navy`, `--ef-slate`, `--ef-sky`, `--ef-warm-white`, same values (`tokens.css:14` to `:17`) | Same values, different names |
| Ground and ink | `--ground`, `--ink`, `--panel`, `--on-panel`, `--hairline`, `--focus`, `--error` (`:64` to `:70`) | Same names and values (`tokens.css:20` to `:29`) | Match |
| Reading ground | None | `--reading-ground` `#F5F3EE`, `--on-reading` `#3E5680` (`tokens.css:24` to `:25`) | Missing here |
| Link underline | None | `--underline` `rgba(62,86,128,0.40)` (`tokens.css:27`) | Missing here |
| Inverted theme | `--cta-ground` `#2E4062`, `--cta-ink` `#F5F3EE`, `--cta-panel` `#CFDAE8`, `--cta-on-panel` `#2E4062` (`:73` to `:76`) | `--inv-ground`, `--inv-ink`, `--inv-panel`, `--inv-on-panel`, plus `--inv-reading-ground`, `--inv-on-reading`, `--inv-hairline`, `--inv-underline`, `--inv-focus`, `--inv-error` `#F2B8AD`, and a `[data-theme="inverted"]` block (`tokens.css:32` to `:41`, `:113` to `:124`) | Same values, different names. 6 missing here |
| Status | None | `--status-done` `#2F5D3A`, `--status-done-tint` `#E3ECE2`, `--status-progress` `#2E4062`, `--status-progress-tint` `#E4E9F1`, `--status-attention` `#6E4A10`, `--status-attention-tint` `#F2E8D6` (`app.css:15` to `:20`) | Missing here |
| Accent | None | `--accent`, defaults to `--ink`, set per client type (`app.css:24`) | Missing here. The Learning Hub would use the default |
| Error tint | `#F3E7E4`, hard coded (`public/assets/css/base.css:194`) | None | Learning Hub only. Drop it with the Client Hub notice |
| Field white | `#FFFFFF`, hard coded in 6 places (`base.css:139`, `:163`, `:176`, `hub.css:89`, `:111`, `viewer.css:64`) | `#FFFFFF` only as a hover and on-accent text (`app.css:592`, `components.css:322`, `:446`, `:452`, `:930`) | Differ. See rank 4 |
| Font stack | `--font`: Figtree, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif (`:82`) | `--font-family`: Figtree, system-ui, -apple-system, Segoe UI, Roboto, sans-serif (`tokens.css:44`) | Different name, 2 extra fallbacks here |
| Font files | 6 Figtree woff2 files, weights 300, 400, 500, Latin and Latin Extended | The same 6 files | Match |
| Weights | `--weight-light` 300, `--weight-regular` 400, `--weight-medium` 500, `--body-weight` 300 (`:83` to `:87`) | 1 weight token per type role: `--type-body-weight` 400 (after `app.css:11`), `--type-caption-weight` 400, `--type-ui-strong-weight` 500, and so on (`tokens.css:49` to `:77`) | Different scheme. Body 300 here, 400 there |
| Type sizes | display 40/42, title 28/32, heading 22/28, body 17/26, ui 16/22, caption 14/20 (`:89` to `:94`) | The same 6, plus `--type-ui-strong-*` 16/22 and `--type-wordmark-*` 20/20 (`tokens.css:47` to `:78`) | Sizes match. 2 roles missing here |
| Tracking | Display -0.01em, written in `base.css:23`. No tokens | `--type-display-tracking` -0.02em, `--type-title-tracking` -0.01em, others 0 (`tokens.css:50`, `:54`) | Differ slightly |
| Larger text | `:root.text-large` sets body 19/29, ui 17/24, caption 15/22 (`public/assets/css/viewer.css:118`) | None | Learning Hub only. Worth sharing |
| Spacing | `--space-1` to `--space-8`: 4, 8, 12, 16, 24, 32, 48, 64 (`:97` to `:104`) | The same names and values (`tokens.css:81` to `:88`) | Match |
| Radius | `--radius-sm` 8, `--radius-md` 12, `--radius-lg` 16, `--radius-pill` 999 (`:107` to `:110`) | The same (`tokens.css:91` to `:94`) | Values match. Used differently: buttons are pill here and md there, fields are md here and sm there |
| Control sizes | `--control-height` 52, `--touch-min` 44, `--margin-phone` 24, `--margin-tablet` 48, `--focus-ring` 2 (`:113` to `:117`) | `--button-height` 52, `--input-height` 52, `--pill-height` 44, `--min-touch-target` 44, `--screen-margin-phone` 24, `--screen-margin-tablet` 48, `--focus-ring` 2, `--icon-stroke` 1.5 (`tokens.css:97` to `:104`) | Same values, different names. `--icon-stroke` missing here |
| Field border | `--field-border: 2px solid var(--slate)` (`:79`) | `--input-border: 2px` (`app.css:27`) | Different name and shape |
| Widths | `--content-max` 720, `--wide-max` 1040 (`:118` to `:119`). Viewer: 288 px library, 340 px reader, 880 px stage, 88 px header (`viewer.css:15`, `:27`, `:69`) | `--content-max` 560, `--workspace-max` 1040, `--reading-max` 680, `--sidebar-width` 248, `--topbar-height` 64 (`app.css:26`, `:166` to `:169`) | Differ. `--content-max` has the same name and a different value |
| Motion | `--motion-duration` 180ms, `--motion-ease` ease-out, `--mark-draw-duration` 1200ms (`:122` to `:124`) | `--motion-duration` 180ms, `--motion-easing` ease-out, `--mark-draw-on` 1200ms (`tokens.css:107` to `:109`) | Same values, 2 different names |
| Reduced motion | Tokens go to 0ms (`:128` to `:133`). Viewer adds `:root.calm-motion` | Tokens go to 0ms, and every transition is forced to 0ms (`tokens.css:126` to `:128`, `app.css:1115` to `:1129`) | Match in effect |
| Shadows | 4 values, hard coded: `0 12px 32px rgba(46,64,98,0.16)`, `0 24px 64px rgba(46,64,98,0.28)`, `0 0 40px rgba(46,64,98,0.2)`, `0 8px 24px rgba(46,64,98,0.18)` | None on surfaces | Differ. See rank 5 |
| Backdrop | Navy at 35% for dialog and scrim (`viewer.css:103`, `:134`) | Navy at 45% for dialog, 35% for the drawer (`components.css:228`, `app.css:461`) | Differ slightly |

### 2 rules that affect a shared guide

- Inline styles. The Client Hub's Content Security Policy blocks `style=""` (`DESIGN.md:351`). The Learning Hub allows it and uses it in 13 places (`public/index.html:156`, `:160`, `:164`, `public/join/index.html:20`, `:38`, `:89`, `:141`, `public/login/index.html:39`, `:57`, `public/account/index.html:26`, and 3 in `public/assets/js/player.js:116`, `:154`, `:162`). Shared components must work from classes alone.
- Text dimmed with opacity. Both apps do it. The Client Hub has it at `public/css/app.css:411`, `:681` and `public/css/components.css:476`, `:717`, `:726`, `:812`, `:993`. The fix in finding 2 (a solid quiet ink token) should go into the shared tokens, so both apps get it.

## 7. Component inventory

Every component in the Learning Hub, with exact class names, tokens and where it is defined. "LH" paths are relative to `public/assets/css/` unless a `.js` or `.html` file is named. States are listed only where the CSS defines them: "none" means the browser default applies. Focus is the global ring (`base.css:38`: 2 px `--focus`, offset 3 px) unless stated.

### Foundations and page frame

| Component | Class names | Variants and sizes | States | Tokens | Defined at |
| --- | --- | --- | --- | --- | --- |
| Type roles | `.t-display`, `.t-title`, `.t-heading`, `.t-body`, `.t-ui`, `.t-ui-strong`, `.t-caption` | 40/42 w300, 28/32 w400, 22/28 w400, 17/26 body weight, 16/22 w400, 16/22 w500, 14/20 w400 | Larger text: `:root.text-large`. Regular weight: `:root.text-regular` | `--type-*-size`, `--type-*-line`, `--weight-*`, `--body-weight` | `base.css:23` to `:29`, `viewer.css:117` to `:118` |
| Link | `a` | 1 | Hover: underline 2 px | none (inherits colour) | `base.css:33` to `:34` |
| Focus ring | `:focus-visible` | Default slate. Navy on `.btn-primary` and inside `.inverted` | n/a | `--focus-ring`, `--focus`, `--cta-ground`, `--radius-sm` | `base.css:37` to `:39` |
| Skip link | `.skip-link` | 1 | Focus: slides in | `--panel`, `--on-panel`, `--space-3`, `--space-4`, `--radius-sm` | `base.css:41` to `:45`, markup `layout.js:45` |
| Screen reader text | `.visually-hidden` | 1 | n/a | none | `base.css:46` |
| Page wrap | `.wrap`, `.wrap-narrow` | Wide 1040 px, narrow 720 px. Side margin 24 px, 48 px from 768 px | n/a | `--wide-max`, `--content-max`, `--margin-phone`, `--margin-tablet` | `base.css:49` to `:60` |
| Stack | `.stack`, `.stack-lg` | 16 px and 24 px between siblings | n/a | `--space-4`, `--space-5` | `base.css:107` to `:108` |
| Quiet text | `.muted` | 1 | n/a | none (opacity 0.8) | `base.css:109` |
| Site header | `ef-header`, `.site-header`, `.brand`, `.brand-mark`, `.brand-name`, `.site-nav` | 72 px tall. `bare` attribute hides the nav. Mark 36 px. "Learning Hub" hidden under 520 px | Nav item hover: `--hairline` fill. Current: weight 500 | `--touch-min`, `--space-2`, `--space-3`, `--space-4`, `--type-ui-*`, `--weight-medium`, `--weight-light`, `--ink`, `--hairline`, `--radius-pill` | `base.css:65` to `:80`, `:212`, markup `layout.js:44` to `:63` |
| Brand mark | `.brand-mark`, `.draw [data-draw]`, `.pulse` | 36 px header, 56 px loading, 64 px cover, 44 px lockup image (`.vtop-lockup`) | Draw on once per visit (1200 ms). Pulse while loading | `--ink`, `--mark-draw-duration`, `--motion-ease` | `base.css:69` to `:70`, `:83` to `:88`, `:198` to `:201`, `viewer.css:12`, `:21` |
| Site footer | `ef-footer`, `.site-footer` | 1 | none | `--space-2` to `--space-7`, `--hairline`, `--touch-min` | `base.css:91` to `:96`, markup `layout.js:85` to `:94` |
| Loading state | `.loading`, `.pulse` | Min height 40vh | Reduced motion: no pulse | `--space-4` | `base.css:197` to `:201` |
| Cover | `.cover` | Full window, shown while membership is checked | none | `--ground`, `--ink`, `--space-4`, `--space-5` | `viewer.css:11` to `:12` |
| Preview banner | `.preview-banner` | 1 | none | `--panel`, `--on-panel`, `--space-2`, `--space-4`, `--type-caption-*` | `base.css:213` |
| Placeholder marker | `.placeholder` | 1 | none | none (`rgba(207, 218, 232, 0.6)`, 4 px radius) | `base.css:211` |

### Shared controls and containers

| Component | Class names | Variants and sizes | States | Tokens | Defined at |
| --- | --- | --- | --- | --- | --- |
| Button | `.btn` | Default (outline), `.btn-primary`, `.btn-quiet` (44 px, no border), `.btn-block` (full width). 52 px tall, 24 px side padding. There is no `.btn-secondary` class: the default is the secondary | Hover: `--hairline` fill (primary goes to `--slate`). Pressed: moves down 1 px. Disabled: 55% opacity, no pointer. Focus: global ring, navy on primary | `--control-height`, `--space-2`, `--space-3`, `--space-5`, `--radius-pill`, `--slate`, `--type-ui-*`, `--weight-medium`, `--ink`, `--hairline`, `--cta-ground`, `--cta-ink`, `--touch-min`, `--motion-duration`, `--motion-ease` | `base.css:112` to `:128` |
| Button row | `.btn-row` | Wraps, 12 px gap | n/a | `--space-3` | `base.css:129` |
| Field | `.field`, `.field-label`, `.field-hint` | Label 16/22 w500. Hint 14/20 | n/a | `--space-1`, `--space-2`, `--space-4`, `--type-ui-*`, `--type-caption-*`, `--weight-medium` | `base.css:132` to `:135` |
| Text input | `.input` | 52 px. 44 px in the library search (`.lsearch .input`) and plan fields (`.plan .input`) | Focus: ring at offset 2 px. Error: `[aria-invalid="true"]` gives a brick border. No hover, no disabled style | `--control-height`, `--space-4`, `--field-border`, `--radius-md`, `--on-panel`, `--type-ui-size`, `--weight-regular`, `--focus-ring`, `--focus`, `--error` (fill is `#FFFFFF`) | `base.css:136` to `:143`, `viewer.css:36`, `hub.css:127` |
| Text area | `textarea.input` | Reflection: min 180 px, body line height. Notes: min 140 px, UI line height | As text input. Resizes vertically | `--space-3`, `--space-4`, `--type-body-line`, `--type-ui-line`, `--type-ui-size` | `hub.css:103`, `viewer.css:85` |
| Input with button | `.input-with-button` | Password field with a Show button inside | Button: `aria-pressed` | none (96 px right padding) | `base.css:144` to `:146` |
| Field error | `.field-err` | 14/20 w500 | n/a | `--error`, `--space-2`, `--type-caption-*`, `--weight-medium` | `base.css:147`, made in `ui.js:19` to `:32` |
| Form message | `.msg` | Error (default), `.msg.ok` (ink) | Empty: hidden | `--error`, `--on-panel`, `--weight-medium`, `--type-ui-*` | `base.css:148` to `:150` |
| Tick box | `.check`, `.check input` | 22 px box, 44 px row | Checked: native, slate accent | `--space-3`, `--touch-min`, `--slate` | `base.css:151` to `:152` |
| Divider with text | `.divider` | 1 (defined, not used on any page) | n/a | `--space-3`, `--space-5`, `--type-caption-size`, `--hairline` | `base.css:153` to `:154` |
| Choice card (radio) | `.choices`, `.choices-2`, `.choice`, `.choice-body`, `.choice-title`, `.choice-price`, `.choice-note` | 1 column, 2 columns from 640 px | Selected: slate border and 1 px inset ring. Focus: ring on the card, offset 3 px. No hover | `--space-1` to `--space-5`, `--radius-md`, `--hairline`, `--slate`, `--focus-ring`, `--focus`, `--weight-medium`, `--type-ui-*`, `--type-heading-*`, `--type-caption-*`, `--motion-*` (fill `#FFFFFF`) | `base.css:157` to `:170` |
| Segmented control (radio) | `.seg`, `.seg label`, `.seg span` | 2 options, 44 px tall | Selected: navy fill, paper text. Focus: 2 px slate ring inset 4 px (see finding 4) | `--slate`, `--radius-pill`, `--touch-min`, `--space-4`, `--type-ui-size`, `--hairline`, `--cta-ground`, `--cta-ink`, `--focus-ring`, `--focus` | `viewer.css:107` to `:114` |
| Path card (link) | `.paths`, `.path`, `.path-title`, `.path-note`, `.path-go` | 1 | Hover: slate border, thicker underline on the last line | `--space-2` to `--space-5`, `--radius-md`, `--hairline`, `--on-panel`, `--slate`, `--weight-medium`, `--type-heading-*`, `--type-ui-*`, `--motion-*` (fill `#FFFFFF`) | `base.css:173` to `:183` |
| Step dots | `.steps-dots` | 8 px dots, current is 24 px wide | Current: `[aria-current="step"]` | `--space-2`, `--radius-pill`, `--hairline`, `--ink`, `--motion-*` | `base.css:186` to `:188` |
| Panel | `.panel` | 24 px padding, 32 px from 768 px | none | `--panel`, `--on-panel`, `--radius-lg`, `--space-4`, `--space-5`, `--space-6` | `base.css:99` to `:106` |
| Notice | `.notice`, `.notice-error` | Default (sky fill), error (`#F3E7E4` fill, brick text) | none | `--radius-md`, `--space-4`, `--ground`, `--ink`, `--error` | `base.css:193` to `:194` |
| Definition rows | `.rows` | Used on the account page | none | `--space-2`, `--space-3`, `--space-4`, `--hairline`, `--weight-medium`, `--type-ui-size` | `base.css:204` to `:208` |
| Tag | `.tag` | 28 px pill, 14/20 w500 | none | `--space-3`, `--radius-pill`, `--ground`, `--ink`, `--type-caption-*`, `--weight-medium` | `hub.css:41` |
| Preview tag | `.tag-preview` | Pill, paper fill, no set height | none | `--space-2`, `--radius-pill`, `--panel` | `viewer.css:24` |
| Step entrance | `.step-enter` | Fade and 6 px rise | Off when motion tokens are 0 ms | `--motion-duration`, `--motion-ease` | `base.css:189` to `:190` |
| Dialog | `dialog.vdialog`, `.vdialog-in`, `.setrow` | 560 px or window minus 48 px. 3 uses: Help, Viewer settings, Log out | Backdrop navy 35%. Inner scrolls at 80vh | `--radius-lg`, `--margin-phone`, `--panel`, `--on-panel`, `--space-2`, `--space-4`, `--space-5`, `--space-6` | `viewer.css:102` to `:107`, markup `index.html:133` to `:186` |

### Viewer shell

| Component | Class names | Variants and sizes | States | Tokens | Defined at |
| --- | --- | --- | --- | --- | --- |
| Viewer header | `.vtop`, `.vtop-main`, `.vtop-id`, `.vtop-title`, `.vtop-sub`, `.vtop-lockup` | 88 px, 72 px under 900 px. Title 28/32, 22/28 under 900 px. Status line and lockup hidden under 900 px | Title truncates with an ellipsis | `--space-1`, `--space-3`, `--space-4`, `--space-5`, `--hairline`, `--ground`, `--type-caption-*`, `--type-title-*`, `--type-heading-*`, `--type-ui-*`, `--weight-medium`, `--weight-regular` | `viewer.css:15` to `:21`, `:124` to `:128` |
| Drawer button | `.vtop-tog` | 44 px circle, 2 px slate border, 22 px icon. Shown under 900 px | `aria-expanded`. No hover style | `--touch-min`, `--radius-pill`, `--slate`, `--ink` | `viewer.css:22`, `:125` |
| Icon | `.icon`, `.vtop-tog svg` | 22 px, stroke 1.8. 18 px in the sidebar foot | n/a | none | `viewer.css:23`, `:53` |
| Column | `.lside`, `.lside-in`, `.rcol`, `.rcol-in`, `.colhead` | Library 288 px, reader 340 px. 256 and 300 px from 900 to 1199 px. Drawers under 900 px (320 px or 86vw, 360 px or 90vw) | Folded: `.vmain.lfold`, `.vmain.rfold`. Drawer open: `.vmain.lopen`, `.vmain.ropen` | `--panel`, `--on-panel`, `--hairline`, `--space-3`, `--space-4`, `--space-5`, `--space-6`, `--motion-*`, `--type-ui-*`, `--weight-medium` | `viewer.css:27` to `:33`, `:79` to `:80`, `:93` to `:99`, `:129` to `:142` |
| Fold button | `.foldbtn` | 44 px circle, no border. `[data-fold]` on desktop, `[data-close]` under 900 px | Hover: `--hairline` fill | `--touch-min`, `--radius-pill`, `--ink`, `--hairline` | `viewer.css:34` to `:35`, `:135`, `:139` |
| Fold tab | `.foldtab`, `.foldtab-l`, `.foldtab-r` | 44 px pill with a label, shown when a column is folded | none | `--space-2`, `--space-4`, `--touch-min`, `--slate`, `--radius-pill`, `--panel`, `--ink`, `--type-caption-size`, `--weight-medium` | `viewer.css:74` to `:76`, `:97` |
| Scrim | `.scrim` | Under 900 px, behind an open drawer | n/a | none (`rgba(46, 64, 98, 0.35)`) | `viewer.css:122`, `:134` |
| Nav button | `.navbtn` | 44 px. Lesson item `.titem` (2 lines: `.ttitle`, `.tstate`). Step item `.stepbtn` (36 px, caption) | Hover: sky at 55%. Current: `[aria-current="page"]` or `[aria-current="step"]`, sky fill, w500. Unseen step: `.unseen`, 70% opacity. Done lesson: `.tstate[data-state="done"]` adds a tick | `--space-1`, `--space-2`, `--space-3`, `--touch-min`, `--radius-md`, `--on-panel`, `--type-ui-*`, `--type-caption-*`, `--ground`, `--weight-medium` | `viewer.css:37` to `:39`, `:44` to `:51` |
| Library list | `.clist`, `.cgroup`, `.chead`, `.tlist`, `.steplist` | Course heading with a layer label. Steps indented with a 2 px rule | n/a | `--space-1` to `--space-4`, `--type-ui-*`, `--weight-medium`, `--hairline` | `viewer.css:40` to `:43`, `:48`, markup `viewer.js:222` to `:246` |
| Library search | `.lsearch` | 44 px input, placeholder as its visible label | Empty result: `#find-none` | as text input | `viewer.css:36`, markup `index.html:51` to `:54`, `:59` |
| Sidebar foot | `.lfoot` | Help and Viewer settings | as nav button | `--space-1`, `--space-3`, `--hairline` | `viewer.css:52` to `:53` |
| Account button and menu | `.acct`, `.acctbtn`, `.acctav`, `.acctwho`, `.acctname`, `.acctmail`, `.acctmenu` | Button 56 px. Avatar 36 px sky disc. Menu opens upwards | Hover and open (`[aria-expanded="true"]`): sky at 55%. Menu: `role="menu"`, arrow keys, Escape | `--space-2`, `--space-3`, `--space-4`, `--hairline`, `--radius-md`, `--radius-pill`, `--on-panel`, `--ground`, `--type-ui-*`, `--type-caption-*`, `--weight-medium` (menu fill `#FFFFFF`, shadow hard coded) | `viewer.css:56` to `:65` |
| Stage | `.stage-wrap`, `.stage-in` | Max 880 px. Padding 32 px, 24 px under 900 px | n/a | `--ground`, `--space-5`, `--space-6`, `--space-7`, `--margin-phone` | `viewer.css:68` to `:70`, `:136` |
| Reader section | `.rsec` | Heading 16/22 w500, text 16/22 | n/a | `--space-3`, `--space-5`, `--hairline`, `--type-ui-*`, `--weight-medium` | `viewer.css:81` to `:85` |
| Reflection summary | `.refl` | Sky block: prompt in `q`, answer, "Open this step" | n/a | `--space-1`, `--space-3`, `--radius-md`, `--ground`, `--type-caption-*`, `--weight-medium` | `viewer.css:86` to `:88`, markup `viewer.js:416` to `:419` |
| Reader file row | `.rfile` | Sky block with a 44 px Download button | as button | `--space-2`, `--space-3`, `--radius-md`, `--ground`, `--touch-min` | `viewer.css:89` to `:90` |
| Viewer settings | `:root.text-regular`, `:root.text-large`, `:root.calm-motion` | 3 settings, each a segmented control | Saved in `ef-viewer-settings` | `--body-weight`, `--type-body-*`, `--type-ui-*`, `--type-caption-*`, `--motion-duration`, `--mark-draw-duration` | `viewer.css:117` to `:119`, `settings-early.js`, `viewer.js:446` to `:458` |

### Home

| Component | Class names | Variants and sizes | States | Tokens | Defined at |
| --- | --- | --- | --- | --- | --- |
| Home heading | `.home-head`, `.home-libhead` | Display title, intro line, finished notice | n/a | `--space-5`, `--space-7` | `viewer.css:72`, `hub.css:19` |
| Dashboard grid | `.dash` | Auto fit columns, 280 px minimum | n/a | `--space-4` | `hub.css:4` |
| Dashboard card | `.dash-card`, `.dash-wide`, `.dash-h` | 6 cards: Continue (wide), Where you are in the loop, This week's practice, Tool library, Next step, Support. Label is 14/20 w500, uppercase, tracked 0.04em, 80% opacity | none | `--space-3`, `--space-4`, `--space-5`, `--panel`, `--on-panel`, `--radius-lg`, `--type-caption-*`, `--weight-medium` | `hub.css:5` to `:9`, markup `viewer.js:143` to `:179` |
| Loop segments | `.loop`, `.loop-seg`, `.loop-label` | 4 across, 2 across under 480 px of window width | `[data-state="done"]`: ink fill, paper text. `"going"`: ink border. `"new"`: plain. `"soon"`: 65% opacity | `--space-1`, `--space-2`, `--space-3`, `--radius-md`, `--ground`, `--ink`, `--warm-white`, `--type-ui-*`, `--weight-medium` | `hub.css:10` to `:16` |
| Tool list | `.toollist` | Full width outline buttons, title left and minutes right | as button | `--space-2`, `--space-3` | `hub.css:17` to `:18` |
| Programme and course group | `.home-prog`, `.home-group` | Title, summary, card grid | n/a | `--space-1` to `--space-6` | `hub.css:22` to `:27` |
| Card grid | `.home-grid` | Auto fill columns, 240 px minimum | n/a | `--space-4` | `viewer.css:73` |
| Lesson card | `.lesson-card`, `.lesson-meta` | A link. Heading, summary, tag and minutes. 24 px padding | Hover: hairline border, lifts 2 px. Focus: global ring | `--space-2`, `--space-3`, `--space-5`, `--panel`, `--on-panel`, `--radius-lg`, `--hairline`, `--motion-*` | `hub.css:28` to `:40`, markup `viewer.js:271` to `:277` |
| Resource card | `.lesson-card.res-card` | Not a link: holds a tag and an Open link or a Download button | Hover: none (cancelled on purpose). Message in `#res-msg` | as lesson card | `hub.css:36` to `:37`, markup `viewer.js:303` to `:309` |

### Lesson player

| Component | Class names | Variants and sizes | States | Tokens | Defined at |
| --- | --- | --- | --- | --- | --- |
| Step panel | `.panel.hub-step` (`#stage`) | Min height 360 px. Heading is `.t-display` on intro, `.t-title` on other steps | Entrance: `.step-enter`. Focus outline removed (it is a focus target, not a control) | as panel, `--space-4` | `hub.css:48` to `:50`, markup `index.html:97` |
| Progress bar | `.hub-progress`, `.hub-progress span` | 6 px | Width set by script | `--radius-pill`, `--hairline`, `--ink`, `--space-5`, `--motion-*` | `hub.css:46` to `:47` |
| Step controls | `.hub-controls`, `.stage-controls`, `.hub-count` | Back (outline), counter, Next or Finish (primary). Buttons min 132 px. Sticky | Back disabled on step 1 | `--space-2`, `--space-3`, `--space-4`, `--space-5`, `--ground` | `hub.css:51` to `:53`, `viewer.css:71` |
| Lesson foot | `.lesson-foot` | Scope and crisis lines, 14/20, 85% opacity | n/a | `--space-2`, `--space-4` | `hub.css:123`, text `layout.js:11` to `:15` |
| Beat label | `.beat` | 14/20 w500, uppercase, tracked 0.04em, 80% opacity. Values: Recognise, Understand, Practise, Rehearse, Transfer, Return | none | `--space-2`, `--type-caption-*`, `--weight-medium` | `hub.css:99`, made in `player.js:20` |
| Claim label | `.claim` | 28 px sky pill, 14/20 w500. Values: Established research, Applied practice, Executive Frame method | none | `--space-3`, `--radius-pill`, `--ground`, `--type-caption-*`, `--weight-medium` | `hub.css:100`, made in `player.js:19` to `:21` |
| Summary points | `.points` | Bulleted list | n/a | `--space-2`, `--space-5` | `hub.css:140` to `:141` |
| Reflect field | `.reflect.field`, `textarea.input` | Label is the prompt. Min 180 px. Privacy hint below | as text area. Saves 300 ms after typing | as field and text area | `hub.css:103`, made in `player.js:92` to `:97` |
| Scenario situation | `.scen-situation` | Sky block | n/a | `--space-4`, `--space-5`, `--ground`, `--radius-md` | `hub.css:106` |
| Scenario option | `.scen`, `.scen-row`, `.scen-opt` | Full width, min 44 px, 16/22 | Hover: slate border. Selected: `[aria-pressed="true"]`, slate border, 1 px inset ring, w500. Focus: global ring | `--space-2`, `--space-3`, `--space-4`, `--touch-min`, `--radius-md`, `--hairline`, `--on-panel`, `--slate`, `--type-ui-*`, `--weight-medium`, `--motion-*` (fill `#FFFFFF`) | `hub.css:107` to `:116`, made in `player.js:98` to `:110` |
| Scenario feedback | `.scen-fb`, `.scen-fb.best`, `.scen-fb.pause`, `.support-line` | Indented 16 px with a 2 px left rule | `.best`: ink rule. `.pause`: no style of its own. Takes focus, outline removed | `--space-3`, `--space-4`, `--hairline`, `--ink`, `--type-ui-*` | `hub.css:117` to `:120` |
| Check step | Uses `.points`, `.t-ui-strong`, `.scen`, `.scen-opt`, `.scen-fb.pause` | A scenario with a signs list and a support line | as scenario | as scenario | made in `player.js:112` to `:123` |
| Plan fields | `.plan`, `.plan .input` | 2 inputs ("When", "I will"), 44 px, max 300 characters, example as placeholder | as text input | `--space-4`, `--touch-min` | `hub.css:126` to `:127`, made in `player.js:124` to `:134` |
| Plan quote | `.plan-quote` | Sky block, 22/28. Used in the return step and on the dashboard | n/a | `--space-1`, `--space-4`, `--space-5`, `--ground`, `--radius-md`, `--type-heading-*` | `hub.css:128` to `:130`, `:9` |
| Frame shape | `.frame`, `.frame-svg`, `.frame-rotor`, `.frame-ring`, `.frame-edge`, `.frame-node`, `.frame-node-inner` | 280 px. 2 columns from 720 px. Points are 40 px radius circles with a 14 px label | Selected: `[aria-current="true"]`, ink fill, paper text. Focus: stroke 2 px to 4 px (see finding 4). Dragging: `.dragging`, grab cursor | `--space-5`, `--ink`, `--hairline`, `--panel`, `--focus`, `--font`, `--weight-medium`, `--motion-duration` (times 3), `--motion-ease` | `hub.css:56` to `:71`, made in `player.js:163` to `:183`, `:272` to `:329` |
| Frame panel | `.frame-panel`, `.frame-hint` | Sky block: "1 of 3", heading, text | Live region | `--ground`, `--radius-md`, `--space-2`, `--space-3`, `--space-5` | `hub.css:72` to `:74` |
| Sort zones | `.sort`, `.sort-pool`, `.sort-zones`, `.sort-zone`, `.sort-zone-head`, `.sort-list` | Pool (sky fill) and groups (2 px dashed hairline, min 120 px). 2 columns from 640 px | Drag over: `.over`. Ready to receive: `.ready`. Both: slate border, sky at 35% | `--space-2`, `--space-3`, `--space-4`, `--radius-md`, `--ground`, `--hairline`, `--slate`, `--touch-min`, `--type-caption-size`, `--motion-*` | `hub.css:77` to `:86`, made in `player.js:184` to `:215` |
| Sort item | `.sort-item`, `.sort-ghost`, `.verdict` | Full width, min 44 px, 16/22 | Selected: `[aria-pressed="true"]`, slate border and inset ring. Dragging: `.lifted` (35% opacity) with a `.sort-ghost` copy (tilted, shadow). Checked: `.verdict` line, `.wrong` in brick | `--touch-min`, `--space-1`, `--space-3`, `--space-4`, `--radius-md`, `--hairline`, `--on-panel`, `--slate`, `--error`, `--type-ui-*`, `--type-caption-*`, `--weight-medium` (fill `#FFFFFF`, shadow hard coded) | `hub.css:87` to `:96`, made in `player.js:331` to `:401` |
| Workshop video | `.video` | 16 by 9, navy, Play button or a placeholder line | Loads the player only on Play | `--radius-md`, `--navy`, `--warm-white`, `--space-5` | `hub.css:133` to `:134`, made in `player.js:146` to `:155` |
| Download row | `.file-row` | Sky block: label, pages, Download button | Message in `[data-dl-msg]` | `--space-3`, `--space-4`, `--radius-md`, `--ground` | `hub.css:137`, made in `player.js:156` to `:162` |
| Missing lesson | `#missing.panel.stack` | Title, text, Back to Home | n/a | as panel | markup `index.html:106` to `:110` |

### Components that exist in 2 or more slightly different forms inside this app

These are the places to merge before the shared guide is written.

| Pattern | Forms | How they differ |
| --- | --- | --- |
| White selectable card with a hairline border | `.choice-body` (`base.css:161`), `.path` (`base.css:174`), `.scen-opt` (`hub.css:109`), `.sort-item` (`hub.css:87`) | Same fill, border and 12 px radius. Padding is 16 by 24 px on 2 of them and 12 by 16 px on the other 2. Only `.path` and `.scen-opt` have a hover. Selected state is `:checked` on 1 and `aria-pressed` on 2 |
| 2 radio patterns | `.choice` (`base.css:159`) and `.seg` (`viewer.css:108`) | Selected is a border on 1 and a navy fill on the other |
| Small pill label | `.tag` (`hub.css:41`), `.claim` (`hub.css:100`), `.tag-preview` (`viewer.css:24`) | `.tag` and `.claim` are the same rule apart from a margin. `.tag-preview` has a paper fill and no set height |
| Uppercase small label | `.dash-h` (`hub.css:7`), `.beat` (`hub.css:99`) | Identical apart from the margin |
| Sky block inside a panel | `.notice` (`base.css:193`), `.frame-panel` (`hub.css:72`), `.scen-situation` (`hub.css:106`), `.plan-quote` (`hub.css:128`), `.file-row` (`hub.css:137`), `.sort-pool` (`hub.css:79`), `.refl` (`viewer.css:86`), `.rfile` (`viewer.css:89`), `.loop-seg` (`hub.css:11`) | All are `--ground` fill with a 12 px radius. Padding is 12, 16, 16 by 24 or 24 px with no pattern |
| Paper card | `.panel` (`base.css:99`), `.dash-card` (`hub.css:5`), `.lesson-card` (`hub.css:28`) | Same fill and 16 px radius. `.panel` grows to 32 px padding from 768 px and the other 2 stay at 24 px. Only `.lesson-card` has a border and a hover |
| Card grid | `.dash` (`hub.css:4`), `.home-grid` (`viewer.css:73`) | `auto-fit` at 280 px against `auto-fill` at 240 px |
| Nav item | `.site-nav a` (`base.css:74`), `.navbtn` (`viewer.css:37`), `.acctbtn` (`viewer.css:57`) | Pill radius and hairline hover on 1. 12 px radius and sky at 55% hover on the other 2 |
| Icon button | `.vtop-tog` (`viewer.css:22`), `.foldbtn` (`viewer.css:34`), `.foldtab` (`viewer.css:74`) | Bordered circle, borderless circle, and bordered pill with a label. Only `.foldbtn` has a hover |
| Progress | `.hub-progress` (`hub.css:46`), `.steps-dots` (`base.css:186`), `.steplist` (`viewer.css:48`) | A bar in lessons, dots on join, a numbered list in the library |
| Error text | `.field-err` (`base.css:147`), `.msg` (`base.css:148`), `.notice-error` (`base.css:194`) | 14 px by the field, 16 px for the form, and a pink block that no page uses yet |
| Text area | `.reflect textarea` (`hub.css:103`), `.rsec .input` (`viewer.css:85`) | 180 px with body line height against 140 px with UI line height |
| Bulleted list | `.points` (`hub.css:140`), `.vdialog-in ul` (`viewer.css:105`) | The same rule written twice |
| Hover tint | `var(--hairline)` (`base.css:79`, `:121`, `viewer.css:35`) and `rgba(207, 218, 232, 0.55)` (`viewer.css:38`, `:58`) | 2 different hover fills for the same kind of control |
| Loading mark size | 56 px (`base.css:198`), 64 px (`viewer.css:12`) | 2 sizes for the same state |
