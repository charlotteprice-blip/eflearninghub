# Content format

Content has 3 layers, after Sarah's architecture proposal (docs/redesign-plan.md):

| Layer | File | What it is |
| --- | --- | --- |
| Programme | `public/content/programmes.json` | An ordered list of courses, for example The Executive Frame Reset. |
| Course | `public/content/courses.json` | An ordered list of lessons. Foundation (built once, used in every programme), bridge (one arm's world) or tool (1 standalone lesson). |
| Lesson | `public/content/lessons/<slug>.json` | One lesson, 8 to 12 minutes, shown one step at a time. |

The viewer (`public/index.html`, with `assets/js/viewer.js` and `assets/js/player.js`) reads these and shows the library, then one step at a time, with the lesson's notes, reflections, plans and files in the right column. Updating a lesson means replacing its JSON file and nothing else.

## The slug is permanent

A lesson's address `/hub/<slug>/` is linked from the Client Hub, so a slug never changes once published. It comes from a dedicated **Slug** property in the Notion database, never from the page title, so renaming a lesson in Notion does not move it. Slugs use lower case letters, digits and hyphens only. `#step-3` after the address opens a particular step. Course ids and programme slugs follow the same rule once published.

## `programmes.json`

| Field | Meaning |
| --- | --- |
| `slug`, `title`, `summary` | Shown as a section heading in the library. |
| `arm` | `null` for every member, or an arm slug from `arms.json`. |
| `courses` | Course ids from `courses.json`, in order. A draft course is skipped. |
| `status` | `published` or `draft` (drafts are hidden). |
| `sample` | `true` marks sample content. Remove for real content. |

## `courses.json`

| Field | Meaning |
| --- | --- |
| `id`, `title`, `summary` | Shown as a group heading in the library and the sidebar. |
| `layer` | `foundation`, `bridge` or `tool`. |
| `arm` | Bridge courses only: the arm slug. Others omit it or use `null`. |
| `loop` | `centre`, `clarify`, `choose`, `return` or `null`. Used by the dashboard's "where you are in the loop". |
| `lessons` | Lesson slugs, in order. |
| `status`, `sample` | As above. |

A lesson's progress is kept per slug in the learner's browser, so a foundation course that appears in 2 programmes shows the same progress in both.

## Lesson file

Top level: `slug`, `title`, `summary`, `minutes`, `course` (the course id), `version` (date of the export), `notionPageId`, `sample`, and `steps`, an ordered list.

### Beats

Each lesson runs 5 beats, in order: Recognise (1 minute, a familiar scene, no clinical labels), Understand (2 minutes, 1 idea), Practise the loop (4 to 6 minutes, on the learner's own situation), Rehearse (2 minutes, a scenario with feedback), Transfer (1 minute, a "when X, I will Y" plan). Return happens at the start of the next lesson, not in the same sitting. Each step carries a `beat` label with one of those 6 words, shown above the step.

### Step types

| Type | Fields | What the learner sees |
| --- | --- | --- |
| `intro` | `heading`, `body` (paragraphs) | Opening screen in the display size. |
| `text` | `heading`, `body`, optional `claim` | One idea, a few short paragraphs. `claim` is `research`, `practice` or `method` and shows a small label: established research, applied practice, Executive Frame method. |
| `frame` | `heading`, `intro`, `points` [{`label`, `body`}] | The rotating shape. One panel per point; the learner can drag to turn it or select a point. 3 points draw a triangle; other counts draw the matching shape. |
| `sort` | `heading`, `instructions`, `categories` [{`id`, `label`}], `items` [{`text`, `category`}], `feedback` | Drag moments into groups, or select then place. If every item has a `category`, a "Check my groups" button appears. |
| `reflect` | `heading`, `prompt`, `placeholder` | A writing box saved in the browser only. |
| `scenario` | `heading`, `situation`, `options` [{`text`, `feedback`, `best`}], `closing` | A situation and 3 or 4 responses. Choosing one shows its feedback; the learner can try each. `best` marks the response the method would take, shown with a darker rule. Nothing is scored. |
| `plan` | `heading`, `prompt`, `when`, `will` | "When X, I will Y". `when` and `will` are example text shown as placeholders. Saved in the browser with the date. |
| `check` | `heading`, `body`, `signsIntro`, `signs` (statements), `question`, `options` [{`text`, `feedback`, `pause`}] | A suitability self check, for the first lesson of a specialist programme. Choosing an option with `pause` shows its feedback plus the scope and crisis lines (1737, 111) and the practice contact. Nothing blocks Next; the learner can carry on, stop or come back later. |
| `return` | `heading`, `prompt`, `fallback` | Shows the previous lesson's latest plan and asks how it went, in a writing box saved in the browser. The previous lesson is the one before this in the programme, or in the library order. `fallback` shows when there is no plan yet. |
| `workshop` | `heading`, `body`, `duration`, `video` {`provider`: `youtube` or `vimeo`, `id`} | A video that loads only when played. An empty `id` shows a placeholder. Keep under 4 minutes, captioned. |
| `download` | `heading`, `body`, `files` [{`label`, `path`, `pages`}] | Download buttons. `path` is `library/<arm>/<file>.pdf` in Cloud Storage; use `library/all/` for files every member can download. |
| `summary` | `heading`, `points` | Closing points; the Next button becomes Finish. |

Text is plain text: no HTML, no Markdown. Write in UK English, without em dashes, digits for numbers, and with no testimonials. No clinical labels in scenes, and no client material in scenarios.

## From Notion

The export script (`scripts/notion-export.mjs`, `npm run content`, not written yet) should produce the 2 index files and 1 lesson file per lesson. Suggested Notion properties on the resources database: Title, Slug, Type (lesson, course, programme), Layer, Arm, Course, Order, Minutes, Status, Summary; and on each lesson page, 1 child block per step with a Type select, a Beat select and, for text steps, a Claim select. Rows that are not Published become drafts.
