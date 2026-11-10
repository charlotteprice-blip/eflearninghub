"use strict";
// Unit tests for content.js (the Notion to content rules) and sync.js (the sync run), with a pretend Notion and
// an in-memory Firestore. Run: npm run check.
const test = require("node:test");
const assert = require("node:assert/strict");
const { flatten, parseLesson, lessonMeta, mapCatalogue, armOf, kindOf } = require("../content");
const { runSync, readBundle, notionClient } = require("../sync");

// ---- Notion shaped builders ----
const rich = t => [{ plain_text: t }];
const blk = (type, t, children, extra = {}) => ({ type, [type]: { rich_text: rich(t), ...extra }, has_children: !!children, children });
const h2 = t => blk("heading_2", t);
const h3 = t => blk("heading_3", t);
const p = t => blk("paragraph", t);
const li = (t, ...children) => blk("bulleted_list_item", t, children.length ? children : undefined);
const todo = (t, checked, ...children) => blk("to_do", t, children.length ? children : undefined, { checked });

const page = (id, props, edited = "2026-11-01T00:00:00.000Z") => ({
  id, last_edited_time: edited,
  properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k,
    k === "Name" ? { type: "title", title: rich(v) }
      : typeof v === "number" ? { type: "number", number: v }
        : ["Status", "Learning Hub status", "Arm", "Category", "Course"].includes(k) ? { type: "select", select: v ? { name: v } : null }
          : k === "Public URL" ? { type: "url", url: v }
            : { type: "rich_text", rich_text: rich(v) }]))
});
const lessonPage = (id, over = {}, edited) => page(id, { Name: "The Tunnel", Slug: "the-tunnel", Summary: "Where the Reset starts.", Course: "reset-open", Order: 1, Minutes: 9, Status: "Published", ...over }, edited);
const META = lessonMeta(lessonPage("p1")).meta;

const BODY = [
  h2("Intro: The Tunnel"), p("You have read the line 3 times.\nNothing has gone in."),
  h2("Text: Why the body comes first"), p("Claim: research"), p("Under pressure the body prepares to act."),
  h2("Frame: Feet, breath, glance"), p("Do them in this order."), li("Feet: Both feet flat."), li("Breath: Out longer than in."), li("Glance", p("Look away, then come back.")),
  h2("Sort: Which is which"), p("Place each moment."), h3("In the tunnel"), li("Rereading the same line"), h3("Out of it"), li("Asking 1 question"), p("Feedback: Most people start in the tunnel."),
  h2("Reflect: Your version"), p("Which is easiest for you?"), p("Example: Feet are easy."),
  h2("Scenario: Try it on"), p("A message lands at 8.05."),
  li("Reply at once", li("It feels quick. It rarely is.")), todo("Feet, breath, glance, then reply", true, li("30 seconds, and a better reply.")), li("Leave it all day (best)", li("Not this one.")),
  p("Closing: The pause is the skill."),
  h2("Plan: Your plan"), p("Pick 1 moment this week."), p("When: the 8.05 message lands"), p("I will: put both feet on the floor"),
  h2("Summary: Keep it"), li("Feet, breath, glance."), li("Use it on small moments.")
];

test("flatten keeps headings, paragraphs per line and nested bullets, and names what it leaves out", () => {
  const ignored = [];
  const out = flatten([h2("A"), p("one\ntwo"), li("x", li("y")), { type: "divider", divider: {} }, { type: "image", image: {} }], ignored);
  assert.deepEqual(out.map(b => b.k), ["h", "p", "p", "li"]);
  assert.equal(out[3].c[0].t, "y");
  assert.deepEqual(ignored, ["image"]);
});

test("a lesson page becomes a lesson file in the viewer's format", () => {
  const { lesson, problems } = parseLesson(META, BODY);
  assert.deepEqual(problems, []);
  assert.equal(lesson.slug, "the-tunnel");
  assert.equal(lesson.course, "reset-open");
  assert.equal(lesson.minutes, 9);
  assert.equal(lesson.version, "2026-11-01");
  assert.deepEqual(lesson.steps.map(s => s.type), ["intro", "text", "frame", "sort", "reflect", "scenario", "plan", "summary"]);
  const [intro, text, frame, sort, reflect, scenario, plan, summary] = lesson.steps;
  assert.deepEqual(intro.body, ["You have read the line 3 times.", "Nothing has gone in."]);
  assert.equal(intro.beat, "Recognise");
  assert.equal(text.claim, "research");
  assert.deepEqual(text.body, ["Under pressure the body prepares to act."]);
  assert.deepEqual(frame.points[2], { label: "Glance", body: "Look away, then come back." });
  assert.equal(frame.intro, "Do them in this order.");
  assert.deepEqual(sort.categories, [{ id: "in-the-tunnel", label: "In the tunnel" }, { id: "out-of-it", label: "Out of it" }]);
  assert.deepEqual(sort.items[1], { text: "Asking 1 question", category: "out-of-it" });
  assert.equal(sort.feedback, "Most people start in the tunnel.");
  assert.equal(reflect.placeholder, "Feet are easy.");
  assert.equal(scenario.situation, "A message lands at 8.05.");
  assert.deepEqual(scenario.options.map(o => !!o.best), [false, true, true]);
  assert.equal(scenario.options[2].text, "Leave it all day");
  assert.equal(scenario.closing, "The pause is the skill.");
  assert.deepEqual([plan.when, plan.will], ["the 8.05 message lands", "put both feet on the floor"]);
  assert.equal(summary.points.length, 2);
});

test("check, return, workshop and download steps", () => {
  const { lesson, problems } = parseLesson(META, [
    h2("Return: How did it go?"), p("Did the moment come?"), p("Fallback: No plan yet."),
    h2("Check: Before you start"), p("This is education, not therapy."), p("Signs: This may not be the right time if"), li("You are in crisis"), li("You are not sleeping"),
    p("Question: Is now a good time?"), li("Yes, carry on", li("Good.")), li("Not right now (pause)", li("That is a sound call.")),
    h2("Workshop: Watch"), p("A short film."), p("Duration: 3 minutes"), p("Video: https://vimeo.com/123456789"),
    h2("Download: Take it with you"), li("Workbook | library/all/reset-workbook.pdf | 12 pages"),
    h2("Summary: Done"), li("Keep going.")
  ]);
  assert.deepEqual(problems, []);
  const [ret, check, workshop, download] = lesson.steps;
  assert.equal(ret.fallback, "No plan yet.");
  assert.equal(ret.beat, "Return");
  assert.equal(check.signsIntro, "This may not be the right time if");
  assert.deepEqual(check.signs, ["You are in crisis", "You are not sleeping"]);
  assert.equal(check.question, "Is now a good time?");
  assert.deepEqual(check.options[1], { text: "Not right now", feedback: "That is a sound call.", pause: true });
  assert.deepEqual(workshop.video, { provider: "vimeo", id: "123456789" });
  assert.deepEqual(download.files, [{ label: "Workbook", path: "library/all/reset-workbook.pdf", pages: 12 }]);
});

test("a page that breaks a rule gives plain problems and no lesson", () => {
  const r = parseLesson(META, [
    h2("Why the body comes first"), p("No type."),
    h2("Scenario: Try it"), p("A message lands."), li("Only one", li("fb")),
    h2("Text: Beat test"), p("Beat: Sprint"), p("Words."),
    h2("Download: Files"), li("Workbook | drive.google.com/file/abc")
  ]);
  assert.equal(r.lesson, undefined);
  assert.equal(r.problems.length, 4);
  assert.match(r.problems[0], /Step 1: the heading "Why the body comes first" must start with a step type/);
  assert.match(r.problems[1], /Step 2 \(scenario\): needs 3 or 4 responses/);
  assert.match(r.problems[2], /the beat "Sprint"/);
  assert.match(r.problems[3], /library\/all\/file\.pdf/);
  assert.match(parseLesson(META, [p("Just words")]).problems[0], /no steps/);
});

test("a check step must offer a way to pause", () => {
  const r = parseLesson(META, [h2("Check: Before you start"), p("Question: Ready?"), li("Yes", li("Good")), li("No", li("Fine"))]);
  assert.match(r.problems[0], /marked \(pause\)/);
});

test("ordinary prose with a colon is kept as prose", () => {
  const { lesson } = parseLesson(META, [h2("Text: A note"), p("Remember: this is not a test."), h2("Summary: End"), li("Done")]);
  assert.deepEqual(lesson.steps[0].body, ["Remember: this is not a test."]);
});

test("lesson properties are checked", () => {
  const bad = lessonMeta(lessonPage("p9", { Slug: "The Tunnel!", Summary: "", Course: "" }));
  assert.equal(bad.problems.length, 3);
  assert.equal(lessonMeta(lessonPage("p9", { Order: undefined })).meta.status, "published");
});

test("catalogue arms map to the app's arms, and internal arms cannot be published", () => {
  assert.equal(armOf("EF"), null);
  assert.equal(armOf("EF|Health — DGBI"), "health");
  assert.equal(armOf("EF|Law · Family"), "law");
  assert.equal(armOf("EF|Corporate / C³ Consulting"), "corporate");
  assert.equal(armOf("EF|Education (provisional)"), "education");
  assert.equal(armOf("EF|Elite"), "elite");
  assert.equal(armOf("Internal / developers"), undefined);
  assert.equal(armOf("EF|Academy / Licensing"), undefined);
  assert.equal(armOf("EF|VET (provisional)"), undefined);
  assert.equal(kindOf("Patient / client resource"), "Handout");
  assert.equal(kindOf("Referrer resource"), "Resource");
});

const row = (id, over = {}) => page(id, {
  Name: "Capacity Check", "Catalogue ID": "EF-ELI-002", Arm: "EF|Elite", Category: "Fillable tool", "Learning Hub status": "Published",
  Slug: "capacity-check", "Hub summary": "A 5 minute check of where your capacity is today.",
  "Public URL": "https://executiveframe.co.nz/downloads/capacity-check.pdf", Description: "INTERNAL QA NOTE", ...over
});

test("only Published catalogue rows become cards, and only safe fields are kept", () => {
  const { resources, problems } = mapCatalogue([
    row("a"),
    row("b", { "Learning Hub status": "Draft", Slug: "draft-one" }),
    row("c", { "Learning Hub status": "", Slug: "blank-one" }),
    row("d", { Name: "Workbook", Slug: "workbook", "Hub file": "library/all/workbook.pdf", "Public URL": "", Arm: "EF", Category: "Workbook" })
  ]);
  assert.deepEqual(problems, []);
  assert.deepEqual(resources, [
    { id: "EF-ELI-002", slug: "capacity-check", title: "Capacity Check", summary: "A 5 minute check of where your capacity is today.", arm: "elite", kind: "Tool", url: "https://executiveframe.co.nz/downloads/capacity-check.pdf" },
    { id: "EF-ELI-002", slug: "workbook", title: "Workbook", summary: "A 5 minute check of where your capacity is today.", arm: null, kind: "Workbook", file: "library/all/workbook.pdf" }
  ]);
  assert.equal(JSON.stringify(resources).includes("INTERNAL"), false);
});

test("a Published row that cannot be shown is left out with reasons", () => {
  const { resources, problems } = mapCatalogue([
    row("a", { Slug: "", "Hub summary": "" }),
    row("b", { Slug: "drive-only", "Public URL": "https://drive.google.com/file/d/abc/view" }),
    row("c", { Slug: "internal-one", Arm: "Internal / developers" }),
    row("d", { Slug: "nothing", "Public URL": "" }),
    row("e"), row("f")
  ]);
  assert.deepEqual(resources.map(r => r.slug), ["capacity-check"]);
  assert.equal(problems.length, 5);
  assert.match(problems[0].problems.join(" "), /Slug .* Hub summary is empty/);
  assert.match(problems[1].problems[0], /not on executiveframe\.co\.nz/);
  assert.match(problems[2].problems[0], /not a Learning Hub arm/);
  assert.match(problems[3].problems[0], /Nothing for a member to open/);
  assert.match(problems[4].problems[0], /used by another published row/);
});

// ---- Sync ----
function fakeDb() {
  const data = {};
  const col = name => (data[name] = data[name] || {});
  return {
    data,
    collection: name => ({
      doc: id => ({
        async get() { const d = col(name)[id]; return { exists: !!d, data: () => (d ? structuredClone(d) : undefined) }; },
        async set(v, opt) { col(name)[id] = opt && opt.merge ? { ...(col(name)[id] || {}), ...structuredClone(v) } : structuredClone(v); },
        async delete() { delete col(name)[id]; }
      }),
      async get() { return { docs: Object.entries(col(name)).map(([id, d]) => ({ id, data: () => structuredClone(d) })) }; }
    })
  };
}
function fakeNotion({ rows = [], lessons = [], bodies = {}, fail = {} }) {
  const calls = { tree: [] };
  return {
    calls,
    async query(id) { if (fail[id]) throw fail[id]; return id === "cat" ? rows : lessons; },
    async tree(id) { calls.tree.push(id); return bodies[id] || []; }
  };
}
const config = { catalogueDb: "cat", lessonsDb: "les" };
const at = iso => () => new Date(iso);
const GOOD = [h2("Intro: The Tunnel"), p("Words."), h2("Summary: End"), li("Done")];

test("a sync publishes cards and lessons, then skips pages that have not changed", async () => {
  const db = fakeDb();
  const notion = fakeNotion({ rows: [row("a")], lessons: [lessonPage("p1"), lessonPage("p2", { Slug: "draft", Status: "Draft" })], bodies: { p1: GOOD } });
  const first = await runSync({ notion, db, now: at("2026-11-10T01:00:00Z"), config });
  assert.equal(first.resources.published, 1);
  assert.deepEqual(first.lessons.updated, ["the-tunnel"]);
  assert.equal(first.lessons.published, 1);
  assert.deepEqual(Object.keys(db.data.contentLessons), ["the-tunnel"]);

  const second = await runSync({ notion, db, now: at("2026-11-10T01:15:00Z"), config });
  assert.equal(second.lessons.unchanged, 1);
  assert.deepEqual(notion.calls.tree, ["p1"]);

  const bundle = await readBundle(db);
  assert.equal(bundle.ok, true);
  assert.deepEqual(bundle.live, { lessons: true, resources: true });
  assert.equal(bundle.lessons[0].slug, "the-tunnel");
  assert.equal(bundle.lessons[0].order, 1);
  assert.equal(bundle.resources[0].slug, "capacity-check");
  assert.equal(bundle.syncedAt, "2026-11-10T01:15:00.000Z");
});

test("a broken edit keeps the last good lesson, and unpublishing removes it", async () => {
  const db = fakeDb();
  await runSync({ notion: fakeNotion({ lessons: [lessonPage("p1")], bodies: { p1: GOOD } }), db, now: at("2026-11-10T01:00:00Z"), config });
  const broken = await runSync({ notion: fakeNotion({ lessons: [lessonPage("p1", {}, "2026-11-10T02:00:00.000Z")], bodies: { p1: [p("No steps now")] } }), db, now: at("2026-11-10T03:00:00Z"), config });
  assert.deepEqual(broken.lessons.kept, ["the-tunnel"]);
  assert.equal(broken.lessons.published, 1);
  assert.match(broken.lessons.problems[0].problems[0], /no steps/);
  assert.equal(db.data.contentLessons["the-tunnel"].lesson.steps.length, 2);

  const gone = await runSync({ notion: fakeNotion({ lessons: [lessonPage("p1", { Status: "Draft" })] }), db, now: at("2026-11-10T04:00:00Z"), config });
  assert.deepEqual(gone.lessons.removed, ["the-tunnel"]);
  assert.deepEqual(db.data.contentLessons, {});
});

test("a live lesson's slug cannot change, and 2 pages cannot share a slug", async () => {
  const db = fakeDb();
  await runSync({ notion: fakeNotion({ lessons: [lessonPage("p1")], bodies: { p1: GOOD } }), db, now: at("2026-11-10T01:00:00Z"), config });
  const moved = await runSync({ notion: fakeNotion({ lessons: [lessonPage("p1", { Slug: "new-name" })], bodies: { p1: GOOD } }), db, now: at("2026-11-10T02:00:00Z"), config });
  assert.match(moved.lessons.problems[0].problems[0], /slug changed from "the-tunnel" to "new-name"/);
  assert.deepEqual(Object.keys(db.data.contentLessons), ["the-tunnel"]);

  const twin = await runSync({ notion: fakeNotion({ lessons: [lessonPage("p2", { Name: "Copy" }), lessonPage("p1")], bodies: { p1: GOOD, p2: GOOD } }), db, now: at("2026-11-10T03:00:00Z"), config });
  assert.equal(twin.lessons.problems.length, 1);
  assert.equal(twin.lessons.problems[0].title, "Copy");
  assert.equal(db.data.contentLessons["the-tunnel"].notionPageId, "p1");
});

test("if Notion cannot be read, nothing stored changes", async () => {
  const db = fakeDb();
  await runSync({ notion: fakeNotion({ rows: [row("a")], lessons: [lessonPage("p1")], bodies: { p1: GOOD } }), db, now: at("2026-11-10T01:00:00Z"), config });
  const down = Object.assign(new Error("Notion answered 404 (object_not_found)"), { status: 404 });
  const r = await runSync({ notion: fakeNotion({ fail: { cat: down, les: down } }), db, now: at("2026-11-10T02:00:00Z"), config });
  assert.match(r.resources.error, /404/);
  assert.match(r.lessons.error, /404/);
  assert.equal(db.data.content.state.resources.length, 1);
  assert.deepEqual(Object.keys(db.data.contentLessons), ["the-tunnel"]);
  assert.equal(db.data.content.state.resourcesSyncedAt, "2026-11-10T01:00:00.000Z");
});

test("before the lessons database exists, cards still sync and a dry run writes nothing", async () => {
  const db = fakeDb();
  const r = await runSync({ notion: fakeNotion({ rows: [row("a")] }), db, now: at("2026-11-10T01:00:00Z"), config: { catalogueDb: "cat", lessonsDb: "" }, dryRun: true });
  assert.equal(r.resources.published, 1);
  assert.match(r.lessons.error, /not connected yet/);
  assert.deepEqual(db.data, {});
  assert.equal((await readBundle(db)).ok, false);
});

test("the Notion client follows pages, retries when asked to slow down, and attaches children", async () => {
  const seen = [];
  const answers = [
    { status: 429, headers: { get: () => "0" }, json: async () => ({}) },
    { ok: true, json: async () => ({ results: [{ id: "r1" }], has_more: true, next_cursor: "c2" }) },
    { ok: true, json: async () => ({ results: [{ id: "r2" }], has_more: false }) },
    { ok: true, json: async () => ({ results: [{ id: "b1", type: "bulleted_list_item", has_children: true }], has_more: false }) },
    { ok: true, json: async () => ({ results: [{ id: "b2", type: "paragraph", has_children: false }], has_more: false }) }
  ];
  const client = notionClient("key", async (url, init) => { seen.push([init.method, url.replace("https://api.notion.com/v1", ""), init.body]); return answers.shift(); }, async () => {});
  const rows = await client.query("db1");
  assert.deepEqual(rows.map(r => r.id), ["r1", "r2"]);
  assert.match(seen[2][2], /"start_cursor":"c2"/);
  const blocks = await client.tree("page1");
  assert.equal(blocks[0].children[0].id, "b2");
  assert.equal(seen[4][1], "/blocks/b1/children?page_size=100");
});
