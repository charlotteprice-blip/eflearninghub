# Redesign plan: Sarah's architecture in this app

Drafted 1 November 2026 from Sarah's architecture proposal email of the same day. Status: waiting for Charlotte's approval. Nothing in this plan is built yet.

## What stays

- This Firebase app, in the shared `ef-client-hub` project, with 1 login across the Learning Hub and the Client Hub. No LearnWorlds.
- The subscription (monthly or annual, 7 day trial) and organisation places. The 5 Cloud Functions, the security rules and the account pages do not change.
- Learner progress, notes, reflections, plans and scenario answers stay in the browser only.
- `/hub/<slug>/` addresses keep working, because the Client Hub links to them.
- No streaks, badges, points, leaderboards or countdown timers. Progress is shown as where you are in the loop.

## What changes

### 1. Content model: 3 layers

Today: a flat list of topics. After: lessons grouped into courses, courses grouped into programmes.

| Layer | What it is | Example |
| --- | --- | --- |
| Foundation course | Built once, used in every programme. 4 courses: F1 Centre, F2 Clarify, F3 Choose, F4 Return and the tools. | The Executive Frame Reset is F1 to F4 plus an opening and closing lesson. |
| Arm bridge course | 2 or 3 lessons that put the method into 1 audience's world. The scenarios change; the method does not. | N1 and N2 for Neurodiversity; L1 and L2 for Law. |
| Tool | 1 standalone interactive lesson. Free lead magnet, in course resource, or both. | Centre in 90 seconds, Decision Triage, Containment Map. |

A programme is an ordered list of courses, for example Chaos to Clarity = N1 + F1 to F4 + N2. A new arm costs 1 bridge course, not a new programme from scratch. Foundation progress carries across programmes because progress is kept per lesson slug.

Files:

- `public/content/lessons/<slug>.json` replaces `topics/<slug>.json`. Same shape as today's topic file (docs/content-format.md), plus `course` (course id) and a `beat` label on each step.
- `public/content/courses.json`: id, slug, title, summary, `layer` (`foundation`, `bridge`, `tool`), `arm` (bridge courses only), `loop` (which of Centre, Clarify, Choose, Return it belongs to), ordered `lessons` (slugs), `status`.
- `public/content/programmes.json`: slug, title, summary, `arm`, ordered `courses` (ids), `status`, display price text (the amount charged still comes from Stripe).
- `public/content/topics.json` goes. The library index is built from courses.json and lessons.

The word "topic" in the code becomes "lesson". The `topicKey` storage key format stays the same so nothing a tester has done is lost.

### 2. Lesson design standard: 5 beats

Every lesson is 8 to 12 minutes and runs the same 5 beats. Each beat is 1 or more steps.

| Beat | Minutes | Step types used | New or existing |
| --- | --- | --- | --- |
| Recognise | 1 | `intro` with a familiar scene, no clinical labels | existing |
| Understand | 2 | `text` with 1 idea, or `frame` for the loop | existing |
| Practise the loop | 4 to 6 | `reflect` on the learner's own situation, 1 per move (Centre, Clarify, Choose) | existing |
| Rehearse | 2 | `scenario`: a situation, 3 or 4 responses, feedback on each | new |
| Transfer | 1 | `plan`: "When X, I will Y", kept in the browser | new |
| Return | at the start of the next lesson | `return`: shows the learner's last plan and asks how it went | new |

New step types in `player.js` and `docs/content-format.md`:

- `scenario`: `heading`, `situation`, `options` [{`text`, `feedback`, `best`}], `closing`. The learner picks 1, reads the feedback, may try another. Nothing is scored.
- `plan`: `heading`, `prompt`, `when` placeholder, `will` placeholder. Saved per lesson in localStorage. Shown on the dashboard as This week's practice.
- `return`: `heading`, `prompt`, `fallback` (text when there is no earlier plan). Reads the previous lesson's plan from localStorage.

Every `text` step may carry `claim`: `research`, `practice` or `method`, shown as a small label (established research, applied practice, Executive Frame method), as Sarah's safeguards ask.

Video stays under 4 minutes, captioned, loaded only on play, through the existing `workshop` step. Reduced motion is already respected.

### 3. Learner dashboard

`public/index.html`'s home section becomes the after login page:

1. **Continue**: the next lesson, its minutes, 1 button.
2. **Where you are in the loop**: the current programme as 4 segments, Centre, Clarify, Choose, Return, each filled by the courses done. No percentage.
3. **This week's practice**: the learner's latest `plan`, and a Return prompt if the next lesson has not been opened for 1 to 3 days (from the lesson's saved date in the browser, no server).
4. **Tool library**: every tool the member can open, 1 tap each.
5. **Next step**: 1 recommended programme or live group, by the member's arm.
6. **Support**: the "education, not therapy" line, 1737, and the practice contact.

Data sources: `courses.json`, `programmes.json`, lesson progress in localStorage, and the member's arm from `checkAccess` (already returned). No new function and no new Firestore field.

The left sidebar lists the current programme's courses and lessons rather than a flat topic list. Search stays. Notes and files on the right stay.

### 4. Arms

- Add `education` to `arms.json`, `ARMS` in `functions/core.js` and `scripts/upload.mjs`.
- `elite` and `performance`: 1 arm or 2 is Sarah's call. Until then, `elite` stays and nothing is added.
- `c3` stays unless Sarah drops it.
- Members are tagged by arm at join (already stored as `arm` on the member record); the dashboard's Next step reads it.

### 5. Safeguards (from Sarah's section 9)

- Scope line on the dashboard and every lesson footer: education, not therapy.
- Crisis signposting (1737 and 111) in every lesson footer. Text in `layout.js`, 1 place.
- Suitability self check before a specialist programme: a `check` step at the start of the programme's first lesson, with a plain "this programme may not be right for you now" route to support. Health programmes wait for Sarah's screening design.
- No client material in scenarios. Scenarios are written content, reviewed by Sarah.
- Reflections, plans and scenario answers never leave the browser (already the rule).
- Privacy statement: name the Google (Sydney) storage and Stripe only. No LearnWorlds DPA needed.

### 6. Notion export

The export script (docs/content-format.md, open item) now targets the 3 layer model. Suggested Notion properties on the resources database: Title, Slug, Type (lesson, course, programme, tool), Layer, Arm, Course, Order, Minutes, Status, Summary, Claim; 1 child block per step with a Beat select. Built once the database is shared with the connection.

### 7. Pricing and products

Not in this plan. Sarah proposed one off purchases; Charlotte has kept the subscription. Programmes show the library plan, not their own price. If one off products are wanted later, that is a Stripe and functions change on its own.

## Build order

Each stage is 1 working session, checked with `npm run check`, `npm run serve` and the browser, committed, and logged.

| Stage | What | Files |
| --- | --- | --- |
| A | Content model and the 3 new step types, with 1 sample foundation lesson in 5 beats and 1 sample tool. The sample Autonomy topic is replaced. | `content/courses.json`, `content/programmes.json`, `content/lessons/`, `player.js`, `viewer.js`, `viewer.css`, `docs/content-format.md`, `README.md` |
| B | The learner dashboard and the programme sidebar. | `index.html`, `viewer.js`, `viewer.css`, `layout.js` (footer lines) |
| C | Arms, safeguards, privacy wording, the `claim` label, the suitability `check` step. | `arms.json`, `functions/core.js`, `upload.mjs`, `player.js`, `privacy/index.html`, tests |
| D | Notion export (`scripts/notion-export.mjs`, `npm run content`), once the database is shared. | `scripts/`, `package.json`, `tasks.mjs`, `.gitignore` (imports/) |
| E | Real content from Notion, PDFs uploaded, Sarah's clinical review, end to end check in test mode. | content only |

Stages A to C do not need the Stripe key or the functions deploy; they run against sample content locally. Stage E needs both.

## Open with Sarah

1. Canonical S.H.I.F.T. wording.
2. Elite and Performance: 1 arm or 2.
3. What is at learn.executiveframe.co.nz on CloudCannon today, and may it move.
4. Which email platform, for the welcome and Return emails (outside this app).
5. The Reset lesson sequence and the first bridge courses, so stage A's sample lesson matches a real one.
6. Sign off on the lesson design standard and the dashboard before stage B.

## Open with Charlotte

1. Approval of this plan.
2. Whether the free tool (Centre in 90 seconds) needs an account, or opens without one. Without one it is a public page outside the member gate.
3. Whether "topic" should become "lesson" in the code now (this plan says yes) or later.
