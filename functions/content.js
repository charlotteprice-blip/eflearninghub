"use strict";
// Notion to Learning Hub content: the rules. No network and no database here, so every rule is unit tested.
// sync.js reads Notion and Firestore and calls these. The formats are in docs/notion-sync.md (what Sarah writes)
// and docs/content-format.md (what the viewer reads).
//
// 2 sources in Sarah's Notion workspace:
//   The catalogue (EF Master Product & Resource Catalogue): 1 row per product or file. A row becomes a resource
//     card only when its "Learning Hub status" is Published. Everything else in the catalogue is ignored.
//   The lessons database: 1 page per lesson, written step by step in the page body. A page becomes a lesson only
//     when its Status is Published.
// Nothing is published unless Sarah marks it Published, and a row or page that breaks a rule is left out and
// listed in the report, never half shown.

const ARMS = ["law", "health", "elite", "corporate", "women", "neurodiversity", "family", "education", "c3"];
const SLUG = /^[a-z0-9][a-z0-9-]{1,60}$/;
const COURSE_ID = /^[a-z0-9][a-z0-9-]{0,60}$/;
const PDF_PATH = /^library\/([a-z0-9-]+)\/([a-z0-9][a-z0-9._-]{0,120}\.pdf)$/;
// Links a resource card may open. Anything else (Google Drive, Claude artifacts) is not open to members.
const LINK_HOSTS = ["executiveframe.co.nz", "www.executiveframe.co.nz"];
const PUBLISHED = "published";

const BEATS = ["Recognise", "Understand", "Practise", "Rehearse", "Transfer", "Return"];
const CLAIMS = ["research", "practice", "method"];
// The beat a step gets when the page does not name one.
const DEFAULT_BEAT = {
  intro: "Recognise", text: "Understand", frame: "Understand", sort: "Practise", reflect: "Practise",
  scenario: "Rehearse", plan: "Transfer", return: "Return", summary: "Transfer"
};
// Labelled lines each step type understands, written as "Label: value" on a line of their own.
const LABELS = {
  intro: [], text: [], frame: [], summary: [],
  sort: ["feedback"],
  reflect: ["example"],
  scenario: ["closing"],
  plan: ["when", "will", "i will"],
  check: ["signs", "question"],
  return: ["fallback"],
  workshop: ["video", "duration"],
  download: []
};
const TYPES = Object.keys(LABELS);
const MAX_TEXT = 4000;
const MAX_STEPS = 40;

const clean = v => String(v == null ? "" : v).replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
const lower = v => clean(v).toLowerCase();
const DASHES = /[–—]/;

// ---------- Notion shapes ----------

const plain = rich => (Array.isArray(rich) ? rich.map(r => (r && r.plain_text) || "").join("") : "");

// The value of a Notion page property, whatever its type, as text, a number, a boolean or a list of names.
function prop(page, name) {
  const p = page && page.properties && page.properties[name];
  if (!p) return undefined;
  switch (p.type) {
    case "title": return clean(plain(p.title));
    case "rich_text": return clean(plain(p.rich_text));
    case "select": return p.select ? clean(p.select.name) : "";
    case "status": return p.status ? clean(p.status.name) : "";
    case "multi_select": return (p.multi_select || []).map(o => clean(o.name));
    case "number": return typeof p.number === "number" ? p.number : null;
    case "url": return clean(p.url);
    case "checkbox": return !!p.checkbox;
    case "formula": return p.formula ? clean(p.formula.string != null ? p.formula.string : p.formula.number) : "";
    case "unique_id": return p.unique_id ? `${p.unique_id.prefix ? p.unique_id.prefix + "-" : ""}${p.unique_id.number}` : "";
    default: return "";
  }
}
const textProp = (page, name) => { const v = prop(page, name); return Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v); };

// Notion blocks (with their children already attached as block.children) to a small neutral shape:
//   { k: "h" | "h3" | "p" | "li", t: text, checked: true for a ticked to do, c: [children] }
// Headings 1 and 2 both start a step. A paragraph with line breaks becomes 1 paragraph per line.
function flatten(blocks, ignored = []) {
  const out = [];
  for (const b of blocks || []) {
    const body = b[b.type] || {};
    const t = plain(body.rich_text);
    const c = b.children && b.children.length ? flatten(b.children, ignored) : [];
    switch (b.type) {
      case "heading_1": case "heading_2": out.push({ k: "h", t: clean(t), c: [] }); break;
      case "heading_3": out.push({ k: "h3", t: clean(t), c: [] }); break;
      case "paragraph": case "quote": case "callout":
        t.split("\n").map(clean).filter(Boolean).forEach(line => out.push({ k: "p", t: line, c: [] }));
        out.push(...c);
        break;
      case "bulleted_list_item": case "numbered_list_item": case "toggle":
        out.push({ k: "li", t: clean(t), c }); break;
      case "to_do": out.push({ k: "li", t: clean(t), checked: !!body.checked, c }); break;
      case "divider": break;
      default: if (!ignored.includes(b.type)) ignored.push(b.type);
    }
  }
  return out;
}

// ---------- Lessons ----------

const childText = item => item.c.map(x => [x.t, childText(x)].filter(Boolean).join(" ")).filter(Boolean).join(" ");
// "(best)" or "(pause)" at the end of a line, or a ticked to do, marks an option.
function marked(item, word) {
  const re = new RegExp(`\\s*\\(${word}\\)\\s*$`, "i");
  return { text: clean(item.t.replace(re, "")), on: !!item.checked || re.test(item.t) };
}
function videoOf(value) {
  const v = clean(value);
  let m = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/.exec(v);
  if (m) return { provider: "youtube", id: m[1] };
  m = /vimeo\.com\/(?:video\/)?(\d{6,12})/.exec(v);
  if (m) return { provider: "vimeo", id: m[1] };
  m = /^(youtube|vimeo)\s+([A-Za-z0-9_-]{6,20})$/i.exec(v);
  return m ? { provider: m[1].toLowerCase(), id: m[2] } : null;
}
const idOf = label => lower(label).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "group";

// 1 step from its heading and the blocks under it. Returns { step } or { problems: [..] }.
function parseStep(head, blocks, n) {
  const where = `Step ${n}`;
  const m = /^([A-Za-z]+)\s*:\s*(.*)$/.exec(head);
  const type = m ? m[1].toLowerCase() : "";
  if (!TYPES.includes(type)) return { problems: [`${where}: the heading "${head}" must start with a step type and a colon, for example "Text: Why the body comes first". Types: ${TYPES.join(", ")}.`] };
  const heading = clean(m[2]);
  const problems = [];
  const need = (ok, what) => { if (!ok) problems.push(`${where} (${type}): ${what}`); };

  // Sort the blocks under the heading into labelled lines, plain paragraphs and list items by section.
  const allowed = ["beat", "claim", ...LABELS[type]];
  const fields = {}, paras = [], lists = { "": [] }, groups = [];
  let section = "";
  for (const b of blocks) {
    if (b.k === "h3") { section = `h3:${groups.length}`; groups.push(b.t); lists[section] = []; continue; }
    if (b.k === "li") { (lists[section] = lists[section] || []).push(b); continue; }
    const lm = /^([A-Za-z][A-Za-z ]{1,18}?)\s*:\s*(.*)$/.exec(b.t);
    const label = lm ? lower(lm[1]) : "";
    if (lm && allowed.includes(label)) {
      fields[label] = clean(lm[2]);
      if (label === "signs" || label === "question") { section = label; lists[section] = lists[section] || []; }
    } else paras.push(b.t);
  }
  const items = name => lists[name] || [];

  const step = { type };
  const beat = fields.beat ? BEATS.find(b => b.toLowerCase() === lower(fields.beat)) : DEFAULT_BEAT[type];
  need(!fields.beat || beat, `the beat "${fields.beat}" is not one of ${BEATS.join(", ")}.`);
  if (beat) step.beat = beat;
  if (heading) step.heading = heading;
  need(heading || type === "intro", "the heading needs words after the colon.");

  switch (type) {
    case "intro":
      need(paras.length, "needs at least 1 paragraph.");
      step.body = paras;
      break;
    case "text":
      need(paras.length, "needs at least 1 paragraph.");
      step.body = paras;
      if (fields.claim) {
        const claim = CLAIMS.find(c => lower(fields.claim).startsWith(c));
        need(claim, `the claim "${fields.claim}" is not one of ${CLAIMS.join(", ")}.`);
        if (claim) step.claim = claim;
      }
      break;
    case "frame": {
      if (paras.length) step.intro = paras.join(" ");
      step.points = items("").map(it => {
        const pm = /^([^:]{1,40}):\s*(.+)$/.exec(it.t);
        return pm ? { label: clean(pm[1]), body: clean([pm[2], childText(it)].filter(Boolean).join(" ")) } : { label: it.t, body: childText(it) };
      });
      need(step.points.length >= 2, "needs at least 2 points, each a bullet written as Label: what it means.");
      need(step.points.every(p => p.label && p.body), "every point needs a label and a description.");
      break;
    }
    case "sort": {
      if (paras.length) step.instructions = paras.join(" ");
      step.categories = groups.map(label => ({ id: idOf(label), label }));
      step.items = [
        ...groups.flatMap((label, g) => items(`h3:${g}`).map(it => ({ text: it.t, category: idOf(label) }))),
        ...items("").map(it => ({ text: it.t }))
      ];
      if (fields.feedback) step.feedback = fields.feedback;
      need(step.categories.length >= 2, "needs at least 2 groups, each a small heading (heading 3) with its moments as bullets underneath.");
      need(new Set(step.categories.map(c => c.id)).size === step.categories.length, "2 groups have the same name.");
      need(step.items.length >= 2, "needs at least 2 moments to sort.");
      break;
    }
    case "reflect":
      need(paras.length, "needs the question as a paragraph.");
      step.prompt = paras.join(" ");
      if (fields.example) step.placeholder = fields.example;
      break;
    case "scenario": {
      need(paras.length, "needs the situation as a paragraph.");
      step.situation = paras.join(" ");
      step.options = items("").map(it => {
        const o = marked(it, "best");
        return { text: o.text, feedback: childText(it), ...(o.on ? { best: true } : {}) };
      });
      if (fields.closing) step.closing = fields.closing;
      need(step.options.length >= 2 && step.options.length <= 5, "needs 3 or 4 responses, each a bullet.");
      need(step.options.every(o => o.text && o.feedback), "every response needs its feedback, written as an indented bullet under it.");
      break;
    }
    case "plan":
      if (paras.length) step.prompt = paras.join(" ");
      if (fields.when) step.when = fields.when;
      if (fields.will || fields["i will"]) step.will = fields.will || fields["i will"];
      break;
    case "check": {
      if (paras.length) step.body = paras;
      if (fields.signs) step.signsIntro = fields.signs;
      step.signs = items("signs").map(it => it.t);
      need(fields.question, "needs a line starting Question: followed by the answers as bullets.");
      if (fields.question) step.question = fields.question;
      step.options = items("question").map(it => {
        const o = marked(it, "pause");
        return { text: o.text, feedback: childText(it), ...(o.on ? { pause: true } : {}) };
      });
      need(step.options.length >= 2, "needs at least 2 answers under the question.");
      need(step.options.some(o => o.pause), "1 answer must be marked (pause), so the support lines show for someone who is not ready.");
      break;
    }
    case "return":
      need(paras.length, "needs the question as a paragraph.");
      step.prompt = paras.join(" ");
      if (fields.fallback) step.fallback = fields.fallback;
      break;
    case "workshop":
      if (paras.length) step.body = paras;
      if (fields.duration) step.duration = fields.duration;
      if (fields.video) {
        const video = videoOf(fields.video);
        need(video, "the Video line must be a YouTube or Vimeo address.");
        if (video) step.video = video;
      }
      break;
    case "download":
      if (paras.length) step.body = paras;
      step.files = items("").map(it => {
        const [label, path, pages] = it.t.split("|").map(clean);
        const file = { label, path: path || "" };
        if (pages && /^\d+$/.test(pages.replace(/\s*pages?$/i, ""))) file.pages = Number(pages.replace(/\s*pages?$/i, ""));
        return file;
      });
      need(step.files.length, "needs at least 1 file, a bullet written as Label | library/all/file.pdf | 12.");
      need(step.files.every(f => f.label && PDF_PATH.test(f.path)), "every file needs a label and a path such as library/all/file.pdf (from npm run upload).");
      break;
    case "summary":
      step.points = items("").map(it => it.t);
      need(step.points.length, "needs at least 1 bullet.");
      break;
  }
  return problems.length ? { problems } : { step };
}

// The properties of a lessons database page. Returns { meta, problems }.
function lessonMeta(page) {
  const problems = [];
  const meta = {
    notionPageId: String(page.id || "").replace(/-/g, ""),
    editedAt: page.last_edited_time || "",
    status: lower(textProp(page, "Status")),
    title: textProp(page, "Name") || textProp(page, "Title"),
    slug: textProp(page, "Slug"),
    summary: textProp(page, "Summary"),
    course: textProp(page, "Course"),
    order: prop(page, "Order"),
    minutes: prop(page, "Minutes")
  };
  if (!meta.title) problems.push("The page has no title.");
  if (!SLUG.test(meta.slug)) problems.push(`Slug "${meta.slug}" must be lower case letters, digits and hyphens, for example the-tunnel-and-the-way-back.`);
  if (!meta.summary) problems.push("Summary is empty.");
  if (!COURSE_ID.test(meta.course)) problems.push(`Course "${meta.course}" must be a course id, for example centre.`);
  if (typeof meta.order !== "number") meta.order = 999;
  if (typeof meta.minutes !== "number" || meta.minutes <= 0) meta.minutes = null;
  return { meta, problems };
}

// A lesson file (docs/content-format.md) from a page's properties and body. Returns { lesson, problems, warnings }.
function parseLesson(meta, notionBlocks) {
  const ignored = [];
  const blocks = flatten(notionBlocks, ignored);
  const problems = [], warnings = [];
  if (ignored.length) warnings.push(`Left out, because the Learning Hub cannot show them: ${ignored.join(", ")}.`);

  const sections = [];
  for (const b of blocks) {
    if (b.k === "h") sections.push({ head: b.t, blocks: [] });
    else if (sections.length) sections[sections.length - 1].blocks.push(b);
    else if (b.t) warnings.push("Text above the first step heading is not shown.");
  }
  if (!sections.length) problems.push("The page has no steps. Each step starts with a heading such as Intro: The Tunnel and the way back.");
  if (sections.length > MAX_STEPS) problems.push(`The page has ${sections.length} steps; the most a lesson can hold is ${MAX_STEPS}.`);

  const steps = [];
  sections.slice(0, MAX_STEPS).forEach((s, i) => {
    const r = parseStep(s.head, s.blocks, i + 1);
    if (r.problems) problems.push(...r.problems);
    else steps.push(r.step);
  });

  const all = JSON.stringify(steps);
  if (steps.some(s => JSON.stringify(s).length > MAX_TEXT * 4)) problems.push("A step is too long to show on 1 screen. Split it into 2 steps.");
  if (DASHES.test(all) || DASHES.test(meta.title + meta.summary)) warnings.push("Contains an em dash or en dash; the house style uses none.");
  if (steps.length && steps[steps.length - 1].type !== "summary" && steps[steps.length - 1].type !== "plan") warnings.push("The last step is usually a Plan or a Summary.");

  if (problems.length) return { problems, warnings };
  const lesson = {
    slug: meta.slug, title: meta.title, summary: meta.summary,
    ...(meta.minutes ? { minutes: meta.minutes } : {}),
    course: meta.course,
    version: (meta.editedAt || "").slice(0, 10),
    notionPageId: meta.notionPageId,
    steps
  };
  return { lesson, problems, warnings };
}

// ---------- Catalogue ----------

// The app's arm for a catalogue Arm name: a slug, null for every member, or undefined when the row's arm is
// internal or unknown and so cannot be published.
function armOf(name) {
  const n = lower(name);
  if (!n || n === "ef") return null;
  if (/internal|developer|academy|licens|\bvet\b/.test(n)) return undefined;
  const rules = [[/law/, "law"], [/health/, "health"], [/neuro/, "neurodiversity"], [/corporate/, "corporate"], [/women/, "women"],
    [/elite|performance/, "elite"], [/family/, "family"], [/education/, "education"], [/c³|c3|consult/, "c3"]];
  const hit = rules.find(([re]) => re.test(n));
  return hit ? hit[1] : undefined;
}

// A short, neutral label for a card. Catalogue categories that describe who a file was written for
// (patient, client, referrer) are never shown to members.
function kindOf(category) {
  const c = lower(category);
  if (/workbook/.test(c)) return "Workbook";
  if (/tool/.test(c)) return "Tool";
  if (/faq/.test(c)) return "FAQ";
  if (/course|elearning/.test(c)) return "Course";
  if (/handout|info|patient|client/.test(c)) return "Handout";
  if (/lead magnet|guide/.test(c)) return "Guide";
  return "Resource";
}

// Resource cards from catalogue rows. Rows that are not Published are skipped without comment.
// Returns { resources, problems: [{ id, title, problems }], warnings: [{ id, title, warnings }] }.
function mapCatalogue(pages) {
  const resources = [], problems = [], warnings = [], seen = new Set();
  for (const page of pages || []) {
    if (lower(textProp(page, "Learning Hub status")) !== PUBLISHED) continue;
    const id = textProp(page, "Catalogue ID");
    const title = textProp(page, "Name");
    const slug = textProp(page, "Slug");
    const summary = textProp(page, "Hub summary");
    const armName = textProp(page, "Arm");
    const arm = armOf(armName);
    const file = textProp(page, "Hub file");
    const url = textProp(page, "Public URL");
    const bad = [], warn = [];

    if (!title) bad.push("Name is empty.");
    if (!SLUG.test(slug)) bad.push(`Slug "${slug}" must be lower case letters, digits and hyphens.`);
    else if (seen.has(slug)) bad.push(`Slug "${slug}" is used by another published row.`);
    if (!summary) bad.push("Hub summary is empty. This is the description members read; the catalogue Description is never shown.");
    if (summary.length > 300) bad.push("Hub summary is longer than 300 characters.");
    if (arm === undefined) bad.push(`Arm "${armName}" is not a Learning Hub arm, so this row cannot be published.`);

    const link = {};
    if (file) {
      if (PDF_PATH.test(file)) link.file = file;
      else bad.push(`Hub file "${file}" must be a path such as library/all/file.pdf (from npm run upload).`);
    } else if (url) {
      let host = "";
      try { const u = new URL(url); host = u.protocol === "https:" ? u.hostname : ""; } catch (e) { /* not an address */ }
      if (LINK_HOSTS.includes(host)) link.url = url;
      else bad.push("Public URL is not on executiveframe.co.nz. Give a Hub file, or a public page on the website.");
    } else bad.push("Nothing for a member to open: give a Hub file or a Public URL on executiveframe.co.nz.");

    if (DASHES.test(title + summary)) warn.push("Contains an em dash or en dash; the house style uses none.");
    if (bad.length) { problems.push({ id, title, problems: bad }); continue; }
    if (warn.length) warnings.push({ id, title, warnings: warn });
    seen.add(slug);
    resources.push({ id, slug, title, summary, arm, kind: kindOf(textProp(page, "Category")), ...link });
  }
  resources.sort((a, b) => a.title.localeCompare(b.title));
  return { resources, problems, warnings };
}

module.exports = {
  prop, textProp, flatten, parseStep, lessonMeta, parseLesson, armOf, kindOf, mapCatalogue,
  ARMS, BEATS, CLAIMS, TYPES, SLUG, PDF_PATH, LINK_HOSTS, PUBLISHED
};
