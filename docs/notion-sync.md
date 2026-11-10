# Content from Notion

Lessons and resource cards come live from Sarah's Notion workspace. When Sarah marks something Published, it appears in the Learning Hub within about 15 minutes, with no deploy. This page says how it works, what Sarah sets up in Notion, and how a lesson page is written.

Built in session 11 (10 November 2026). Not yet run against the real Notion workspace: the key, the 3 new catalogue columns and the lessons database are still to come.

## How it works

| Part | Where | What it does |
| --- | --- | --- |
| `syncContent` | `functions/index.js`, every 15 minutes, once `NOTION.scheduled` is `true` | Reads the 2 Notion databases with a read only key and stores what is Published in the `learninghub` database. |
| The rules | `functions/content.js` | Turns a catalogue row into a resource card and a lesson page into a lesson file. Unit tested. |
| The run | `functions/sync.js` | Reads Notion, compares with what is stored, writes what changed, and keeps a report. |
| `getContent` | `functions/index.js` | Hands the stored lessons and cards to the viewer. Any logged in person may call it. |
| The viewer | `public/assets/js/viewer.js` | Uses live lessons and cards when they exist, and the files in `public/content` when they do not. |

Stored in Firestore (`learninghub`), readable only by the functions:

- `content/state`: the resource cards, when each source last synced, and the last report.
- `contentLessons/<slug>`: 1 lesson file each, with its order and when its Notion page was last edited.

Programmes and courses stay as files in this repository (`public/content/programmes.json` and `courses.json`), because they change rarely and decide the shape of the library. A lesson names its course; a new course is a change here, not in Notion.

## What is kept safe

1. Nothing is published unless Sarah marks it Published. The rest of the catalogue (internal rows, referrer and clinical material, rows naming organisations) is never read into the Learning Hub.
2. Only a row's Name, Slug, Hub summary, Arm, Category, Hub file and Public URL are used. The catalogue's Description, price, Drive link and Stripe link are never stored or shown; Description holds internal review notes.
3. Catalogue categories that say who a file was written for (patient, client, referrer) are shown to members as Handout or Resource.
4. A Published row or page that breaks a rule is left out and listed in the report. It is never half shown.
5. A live lesson that is edited into a broken state keeps its last good version until the page is fixed.
6. A lesson is removed only when its page is no longer Published.
7. A live lesson's slug cannot change. The old address stays live and the report says so.
8. If Notion cannot be reached, or a database cannot be read, nothing stored for that source changes.
9. The key is read only and sees only what Sarah has shared with it. The function log records counts only, never titles or text.

## Set up in Notion (Sarah's workspace)

### 1. The integration and its key

Notion lets only a workspace owner create an internal integration.

1. Open `notion.so/profile/integrations` and choose New integration.
2. Name: `Executive Frame Learning Hub`. Associated workspace: Sarah's workspace. Type: Internal.
3. Capabilities: Read content only. No update, insert or comment capabilities, and no user information.
4. Open the catalogue, then the 3 dot menu, Connections, and add the integration. Do the same on the lessons database once it exists. Share nothing else with it.

The key (Internal Integration Secret) stays on the integration's page in Notion. It is typed at a hidden prompt and never pasted into chat, a file or a message:

```
npm run content -- check      asks for the key; reads Notion; prints what would be published; changes nothing
npm run secret:notion         saves the key in Secret Manager for the scheduled sync
```

### 2. Three new columns on the catalogue

The catalogue is the EF Master Product & Resource Catalogue (`1dab155b5e2e476d994f4f334b489f5b`).

| Column | Type | What goes in it |
| --- | --- | --- |
| Learning Hub status | Select: Draft, Published | Published puts the row in the Learning Hub. Blank or Draft keeps it out. |
| Slug | Text | The card's permanent short name: lower case letters, digits and hyphens, for example `shift-protocol-card`. |
| Hub summary | Text | The 1 or 2 sentences members read, 300 characters at most. |

1 optional column, Hub file (Text): the path of a file in the Learning Hub library, for example `library/all/shift-protocol-card.pdf`, for files only members may download. Charlotte uploads the file with `npm run upload` and gives Sarah the path.

A Published row needs something a member can open: either a Hub file, or a Public URL on executiveframe.co.nz. Google Drive and Claude artifact links are not open to members, so a row with only those is left out and listed in the report.

Arms are matched by name: EF is every member; EF|Health and EF|Health DGBI are `health`; EF|Law and EF|Law Family are `law`; EF|Corporate / C³ Consulting is `corporate`; EF|Education is `education`; and so on for Elite, Women, Neurodiversity and Family. Internal, Academy and VET rows cannot be published.

### 3. The lessons database

A new database in Sarah's workspace, named Hub Lessons, shared with the integration. 1 page is 1 lesson.

| Property | Type | What goes in it |
| --- | --- | --- |
| Name | Title | The lesson title. |
| Slug | Text | Permanent, lower case letters, digits and hyphens. It is the lesson's address, `/hub/<slug>/`. |
| Summary | Text | 1 sentence, shown on the lesson card. |
| Course | Select | The course id from `courses.json`: `reset-open`, `centre`, `clarify`, `choose`, `return`, `reset-close`, and so on. |
| Order | Number | The lesson's place within its course: 1, 2, 3. |
| Minutes | Number | About how long the lesson takes. |
| Status | Select: Draft, Published | Published puts the lesson in the Learning Hub. |

When the database exists, its id goes in `NOTION.lessonsDb` in `functions/sync.js`, followed by `npm run deploy:functions`. Until then the sample lessons in `public/content/lessons` stay.

## How a lesson page is written

Each step starts with a heading (Heading 1 or Heading 2) made of the step type, a colon and the step's title. Everything under that heading belongs to the step.

```
Intro: The Tunnel and the way back
You have read the first line of the message 3 times and nothing has gone in.
This lesson is about the 30 seconds before you reply.

Text: Why the body comes first
Claim: research
Under pressure the body prepares to act before thinking has caught up.

Scenario: Try it on
A message lands at 8.05: Can we talk this morning?
- Reply at once
    - It feels quick. It rarely is.
- Feet, breath, glance, then reply (best)
    - 30 seconds, and a better reply.
- Leave it until the afternoon
    - The worry grows while you wait.
Closing: The pause is the skill.

Plan: Your plan for this week
Pick 1 moment this week when the pressure usually rises.
When: the 8.05 message lands
I will: put both feet on the floor before I reply
```

Lines such as `Claim: research` are labelled lines: a label, a colon and a value, on a line of their own. Only the labels listed for a step type are read that way; any other sentence with a colon stays as ordinary text.

| Step type | Under the heading | Labelled lines |
| --- | --- | --- |
| Intro | Paragraphs. | |
| Text | Paragraphs. | `Claim:` research, practice or method |
| Frame | An optional opening paragraph, then 1 bullet for each point, written `Label: what it means`. 3 points draw a triangle. | |
| Sort | An optional instruction, then a small heading (Heading 3) for each group with its moments as bullets underneath. | `Feedback:` shown after checking |
| Reflect | The question, as a paragraph. | `Example:` the grey example text in the box |
| Scenario | The situation, as a paragraph, then 3 or 4 bullets, 1 for each response. Indent a bullet under each response for its feedback. End the method's response with `(best)`. | `Closing:` shown after a choice |
| Plan | An optional paragraph. | `When:` and `I will:` the example plan |
| Check | The scope paragraphs. `Signs:` and the lead in line, then 1 bullet for each sign. `Question:` and the question, then 1 bullet for each answer with its feedback indented underneath. End the answer for someone who is not ready with `(pause)`; the support lines (1737, 111, the practice contact) are added to it automatically. At least 1 answer must be marked. | `Signs:`, `Question:` |
| Return | The question about the last lesson's plan, as a paragraph. | `Fallback:` shown when there is no plan yet |
| Workshop | Paragraphs. | `Video:` a YouTube or Vimeo address. `Duration:` for example 3 minutes |
| Download | Optional paragraphs, then 1 bullet for each file, written `Label \| library/all/file.pdf \| 12` (label, library path, pages). | |
| Summary | 1 bullet for each closing point. | |

Every step may also carry `Beat:` followed by Recognise, Understand, Practise, Rehearse, Transfer or Return. Without it, the step takes the usual beat for its type (Intro is Recognise, Text and Frame are Understand, Sort and Reflect are Practise, Scenario is Rehearse, Plan and Summary are Transfer, Return is Return).

The writing rules in `docs/content-format.md` apply: plain text, UK English, no em dashes or en dashes, digits for numbers, no testimonials, no clinical labels in scenes and no client material in scenarios. Bold, italics, images, tables and embeds in the Notion page are not carried across. The sync lists a dash as a style note but still publishes.

## Day to day

```
npm run content -- check     before Sarah's first publish, and whenever something does not appear
npm run content -- status    the report from the last scheduled sync
npm run content -- sync      do not wait 15 minutes
npm run logs                 counts from each scheduled run
```

The report lists every row or page that is marked Published but left out, with the reason in plain words, so it can be sent to Sarah as it is.

## First run, in order

1. Sarah (or Charlotte as a workspace owner) creates the integration and shares the catalogue with it.
2. Sarah adds the 3 catalogue columns and marks 1 or 2 rows Published.
3. `npm run content -- check` until the report is clean.
4. `npm run setup -- --only=apis` (adds Cloud Scheduler), `npm run secret:notion`, then `npm run deploy:functions` and `npm run deploy:hosting`. Set `NOTION.scheduled` to `true` in `functions/sync.js` before this deploy. It is `false` until the key is saved, so that the other functions can deploy without the Notion key: Firebase asks for every secret the code declares, whichever functions are named.
5. `npm run content -- sync`, then open the Learning Hub and look at Resources on Home.
6. Sarah creates Hub Lessons, shares it with the integration and writes the first lesson. Its id goes in `NOTION.lessonsDb`, then `npm run deploy:functions`.

## Not built yet

1. Copying files from Sarah's Google Drive into the library bucket. For now a member only file is uploaded with `npm run upload` and its path typed into Hub file.
2. A check inside the scheduled sync that a lesson's course exists. `npm run content -- check` does check it; in the viewer, a lesson naming an unknown course simply does not appear.
3. Searching resource cards from the library's search box.
4. Telling Sarah about problems without Charlotte running a command. The report is in Firestore, so an email or a page for Sarah can be added later.
