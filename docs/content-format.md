# Topic content format

Each topic is one JSON file at `public/content/topics/<slug>.json`, listed in `public/content/topics.json`. The hub template (`public/hub/index.html`) reads it and shows one step at a time. Updating a topic means replacing its JSON file and nothing else.

## The slug is permanent

The address `/hub/<slug>/` is linked from the Client Hub, so a slug never changes once published. It comes from a dedicated **Slug** property in the Notion database, never from the page title, so renaming a topic in Notion does not move it. Slugs use lower case letters, digits and hyphens only. `#step-3` after the address opens a particular step.

## Library index: `topics.json`

| Field | Meaning |
| --- | --- |
| `slug` | Permanent address, as above. |
| `title`, `summary` | Shown on the library card. |
| `minutes` | Approximate time, shown on the card and the hub. |
| `arms` | `["all"]` for every member, or arm slugs such as `["law", "health"]`. |
| `status` | `published` or `draft` (drafts are hidden). |
| `sample` | `true` shows a "Sample content" tag; remove for real content. |

## Topic file

Top level: `slug`, `title`, `summary`, `minutes`, `arms`, `version` (date of the export), `notionPageId`, and `steps`, an ordered list. Each step has a `type`:

| Type | Fields | What the learner sees |
| --- | --- | --- |
| `intro` | `heading`, `body` (paragraphs) | Opening screen in the display size. |
| `text` | `heading`, `body` | One idea, a few short paragraphs. |
| `frame` | `heading`, `intro`, `points` [{`label`, `body`}] | The rotating triangle. One panel per point; the learner can drag to turn it or select a point. Three points draw a triangle; other counts draw the matching shape. |
| `sort` | `heading`, `instructions`, `categories` [{`id`, `label`}], `items` [{`text`, `category`}], `feedback` | Drag moments into groups, or select then place. If every item has a `category`, a "Check my groups" button appears. |
| `reflect` | `heading`, `prompt`, `placeholder` | A writing box saved in the browser only. |
| `workshop` | `heading`, `body`, `duration`, `video` {`provider`: `youtube` or `vimeo`, `id`} | A video that loads only when played. An empty `id` shows a placeholder. |
| `download` | `heading`, `body`, `files` [{`label`, `path`, `pages`}] | Download buttons. `path` is `library/<arm>/<file>.pdf` in Cloud Storage; use `library/all/` for files every member can download. |
| `summary` | `heading`, `points` | Closing points; the Next button becomes Finish. |

Text is plain text: no HTML, no Markdown. Write in UK English, without em dashes, and with no testimonials.

## From Notion

The Notion export should produce one JSON file per topic in this shape, plus the matching entry in `topics.json`. Suggested Notion properties: Title, Slug, Summary, Minutes, Arms (multi-select), Status, and one child block per step with a Type select. The export script is not written yet (open item in the work log).
