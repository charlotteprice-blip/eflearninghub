"use strict";
// Notion to Learning Hub content: the moving parts. content.js holds the rules.
//
// syncContent (scheduled, index.js) calls runSync every 15 minutes. It reads Sarah's Notion workspace with a
// read only key (Secret Manager, NOTION_TOKEN) and writes what is Published to the learninghub database:
//   content/state            the resource cards, when each source last synced, and the last report
//   contentLessons/<slug>    1 lesson file each, with its order and when its Notion page was last edited
// getContent (callable, index.js) hands that to the viewer. Browsers cannot read these documents directly.
//
// What is kept safe:
//   If Notion cannot be reached, or a database cannot be read, nothing from that source changes.
//   A published lesson that breaks a rule keeps its last good version and is listed in the report.
//   A lesson is removed only when its page is no longer Published.
//   A lesson's slug cannot change once it is live; the old slug stays and the report says so.
//   Only names, summaries and lesson text are stored. Notion's Description, prices and file links are not.

const { lessonMeta, parseLesson, mapCatalogue, PUBLISHED } = require("./content");

// The 2 databases in Sarah's workspace. These ids are not secret; the key is.
const NOTION = {
  // false: the scheduled sync (syncContent) is not deployed and the functions do not ask for the Notion key, so
  // every other function can deploy without it. Set to true once the key is saved (npm run secret:notion), then
  // npm run deploy:functions. npm run content -- check and -- sync work from a computer either way.
  scheduled: false,
  catalogueDb: "1dab155b5e2e476d994f4f334b489f5b",
  // The lessons database: empty until Sarah creates it from docs/notion-sync.md. Lessons stay as the sample
  // files in public/content until then.
  lessonsDb: ""
};
const NOTION_VERSION = "2022-06-28";
const API = "https://api.notion.com/v1";
// A page edited this recently is read again even if its edit time has not changed, because Notion rounds edit
// times to the minute.
const SETTLE_MS = 2 * 60 * 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function notionClient(token, fetchImpl = fetch, wait = sleep) {
  async function request(method, path, body) {
    for (let attempt = 0; ; attempt++) {
      const res = await fetchImpl(`${API}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      if (res.ok) return res.json();
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        const after = Number(res.headers && res.headers.get && res.headers.get("retry-after")) || 2 ** attempt;
        await wait(Math.min(after, 30) * 1000);
        continue;
      }
      let detail = "";
      try { const j = await res.json(); detail = j.code || ""; } catch (e) { /* no body */ }
      const err = new Error(`Notion answered ${res.status}${detail ? ` (${detail})` : ""}`);
      err.status = res.status;
      err.code = detail;
      throw err;
    }
  }
  async function pagesOf(call) {
    const out = [];
    let cursor;
    do {
      const res = await call(cursor);
      out.push(...(res.results || []));
      cursor = res.has_more ? res.next_cursor : null;
    } while (cursor);
    return out;
  }
  // Every row of a database, or only those matching a Notion filter.
  const query = (databaseId, filter) => pagesOf(cursor =>
    request("POST", `/databases/${databaseId}/query`, { page_size: 100, ...(filter ? { filter } : {}), ...(cursor ? { start_cursor: cursor } : {}) }));
  // A page's blocks with their children attached, 3 levels deep (a response's feedback sits 1 level down).
  async function tree(blockId, depth = 3) {
    const blocks = await pagesOf(cursor => request("GET", `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ""}`));
    for (const b of blocks) if (b.has_children && depth > 1 && b.type !== "child_page" && b.type !== "child_database") b.children = await tree(b.id, depth - 1);
    return blocks;
  }
  return { query, tree };
}

const short = err => String((err && err.message) || err).slice(0, 200);

// Reads both sources and writes what changed. Returns the report that is also stored in content/state.
async function runSync({ notion, db, now, config = NOTION, dryRun = false }) {
  const at = now();
  const stateRef = db.collection("content").doc("state");
  const lessonsCol = db.collection("contentLessons");
  const report = {
    at: at.toISOString(),
    resources: { published: 0, problems: [], warnings: [], error: null },
    lessons: { published: 0, updated: [], unchanged: 0, kept: [], removed: [], problems: [], warnings: [], error: null }
  };
  const update = { report };

  // ----- Catalogue to resource cards -----
  try {
    let rows;
    try {
      rows = await notion.query(config.catalogueDb, { property: "Learning Hub status", select: { equals: "Published" } });
    } catch (err) {
      // The column is a Status property, or has not been added yet: read every row and let content.js decide.
      if (err.status !== 400) throw err;
      rows = await notion.query(config.catalogueDb);
    }
    const mapped = mapCatalogue(rows);
    report.resources.published = mapped.resources.length;
    report.resources.problems = mapped.problems;
    report.resources.warnings = mapped.warnings;
    update.resources = mapped.resources;
    update.resourcesSyncedAt = at.toISOString();
  } catch (err) {
    report.resources.error = short(err);
  }

  // ----- Lessons database to lesson files -----
  const writes = [];
  if (!config.lessonsDb) {
    report.lessons.error = "The lessons database is not connected yet (NOTION.lessonsDb in functions/sync.js).";
  } else {
    try {
      const pages = await notion.query(config.lessonsDb);
      const snap = await lessonsCol.get();
      const stored = new Map(snap.docs.map(d => [d.id, d.data()]));
      const byPage = new Map([...stored].map(([slug, d]) => [d.notionPageId, slug]));
      const keep = new Set();
      const L = report.lessons;

      const published = pages.map(page => ({ page, ...lessonMeta(page) })).filter(x => x.meta.status === PUBLISHED);
      const claims = new Map();
      for (const { meta } of published) claims.set(meta.slug, [...(claims.get(meta.slug) || []), meta.notionPageId]);

      for (const { page, meta, problems } of published) {
        const was = byPage.get(meta.notionPageId);
        const label = { title: meta.title, slug: meta.slug };
        if (was && was !== meta.slug) {
          keep.add(was);
          L.problems.push({ ...label, problems: [`The slug changed from "${was}" to "${meta.slug}". A live lesson's address cannot change, so "${was}" stays live as it was. Change the slug back.`] });
          continue;
        }
        if (problems.length) { if (was) { keep.add(was); L.kept.push(was); } L.problems.push({ ...label, problems }); continue; }
        // 2 published pages with 1 slug: the page that already holds it keeps it; the others wait.
        if (claims.get(meta.slug).length > 1 && (stored.get(meta.slug) || {}).notionPageId !== meta.notionPageId) {
          L.problems.push({ ...label, problems: [`Slug "${meta.slug}" is used by another published lesson.`] });
          continue;
        }
        keep.add(meta.slug);
        const old = stored.get(meta.slug);
        const settled = at.getTime() - new Date(meta.editedAt).getTime() > SETTLE_MS;
        if (old && old.notionEditedAt === meta.editedAt && old.order === meta.order && settled) { L.unchanged++; continue; }

        const parsed = parseLesson(meta, await notion.tree(page.id));
        if (parsed.warnings.length) L.warnings.push({ ...label, warnings: parsed.warnings });
        if (parsed.problems.length) { if (old) L.kept.push(meta.slug); L.problems.push({ ...label, problems: parsed.problems }); continue; }
        L.updated.push(meta.slug);
        writes.push(() => lessonsCol.doc(meta.slug).set({ lesson: parsed.lesson, order: meta.order, notionPageId: meta.notionPageId, notionEditedAt: meta.editedAt, syncedAt: at.toISOString() }));
      }
      for (const slug of stored.keys()) {
        if (keep.has(slug)) continue;
        L.removed.push(slug);
        writes.push(() => lessonsCol.doc(slug).delete());
      }
      // What is live after this run: stored lessons that stay, plus the ones written now.
      L.published = new Set([...[...stored.keys()].filter(slug => keep.has(slug)), ...L.updated]).size;
      update.lessonsSyncedAt = at.toISOString();
    } catch (err) {
      writes.length = 0;
      report.lessons.error = short(err);
    }
  }

  if (!dryRun) {
    for (const write of writes) await write();
    await stateRef.set(update, { merge: true });
  }
  return report;
}

// Everything the viewer needs, in 1 answer. ok is false until the first sync has run.
async function readBundle(db) {
  const [state, snap] = await Promise.all([db.collection("content").doc("state").get(), db.collection("contentLessons").get()]);
  const s = state.exists ? state.data() : null;
  const lessons = snap.docs.map(d => d.data()).filter(d => d && d.lesson)
    .sort((a, b) => (a.order - b.order) || a.lesson.title.localeCompare(b.lesson.title))
    .map(d => ({ ...d.lesson, order: d.order }));
  return {
    ok: !!s,
    syncedAt: s ? s.report && s.report.at : null,
    // Which sources have synced at least once. Until a source has, the viewer keeps its own sample files for it.
    live: { lessons: !!(s && s.lessonsSyncedAt), resources: !!(s && s.resourcesSyncedAt) },
    lessons,
    resources: (s && s.resources) || []
  };
}

module.exports = { notionClient, runSync, readBundle, NOTION, NOTION_VERSION };
