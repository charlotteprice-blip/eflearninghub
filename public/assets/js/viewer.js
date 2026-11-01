// The Learning Hub viewer: one full-window app for members, after the Themescape viewer.
// Left: the library (courses and their lessons, the open lesson's steps, help, settings, account menu).
// Middle: the stage, showing one step at a time (player.js).
// Right: notes and files for the open lesson (about, notes, reflections, downloads).
// Content: programmes.json lists courses; courses.json lists lessons; each lesson is lessons/<slug>.json.
// Addresses: / and /library/ show the library; /hub/<slug>/#step-3 opens a lesson at a step. These never change,
// because the Client Hub links to them. Everything a learner writes stays in this browser.

import { requireMember } from "./gate.js";
import { logOut } from "./app.js";
import { $, store, params, nzDate } from "./ui.js";
import { placeMark } from "./layout.js";
import { createPlayer, progressLabel, lessonKey, esc } from "./player.js";

placeMark(document.querySelector("[data-cover-mark]"), { draw: false });

const { user, access } = await requireMember({ banner: false });

// ---------- Identity ----------
const name = user ? (user.displayName || (user.email || "").split("@")[0]) : "Local preview";
$("id-who").textContent = user ? (user.displayName || user.email || "") : "";
$("id-preview").hidden = !access.preview;
$("acct-name").textContent = name;
$("acct-mail").textContent = user ? user.email || "" : "Membership not checked";
$("acct-av").textContent = (name || "?").trim().charAt(0).toUpperCase();

// ---------- Content ----------
const getJson = path => fetch(path, { cache: "no-cache" }).then(r => (r.ok ? r.json() : null)).catch(() => null);
const [coursesData, programmesData] = await Promise.all([getJson("/content/courses.json"), getJson("/content/programmes.json")]);
const allCourses = (coursesData && coursesData.courses) || [];
const inMembership = arm => !arm || !access.arms || access.arms === "all" || access.arms.includes(arm);
const courses = allCourses.filter(c => c.status !== "draft" && inMembership(c.arm));
const programmes = ((programmesData && programmesData.programmes) || []).filter(p => p.status !== "draft" && inMembership(p.arm));
const courseOf = id => courses.find(c => c.id === id);
const LAYERS = { foundation: "Foundation", bridge: "Bridge", tool: "Tool" };

// Lessons in display order: each programme's courses in turn, then any course outside a programme.
const order = [];
const seenCourse = new Set();
function addCourse(c) {
  if (!c || seenCourse.has(c.id)) return;
  seenCourse.add(c.id);
  (c.lessons || []).forEach(slug => { if (!order.some(l => l.slug === slug)) order.push({ slug, course: c }); });
}
programmes.forEach(p => (p.courses || []).forEach(id => addCourse(courseOf(id))));
courses.forEach(addCourse);

// Lesson files are small, so they load together at the start; the library then knows every step count.
const files = {};
await Promise.all(order.map(async l => {
  const f = await getJson(`/content/lessons/${l.slug}.json`);
  if (f && Array.isArray(f.steps) && f.steps.length) files[l.slug] = f;
  else console.warn("Lesson not loaded", l.slug);
}));
const lessons = order.filter(l => files[l.slug]).map(l => ({ ...l, file: files[l.slug] }));
const lessonsOf = c => lessons.filter(l => l.course.id === c.id);

// The lesson before this one, for return steps: within the first programme that holds its course, else in the library order.
function priorOf(slug) {
  const me = lessons.find(l => l.slug === slug);
  if (!me) return null;
  const prog = programmes.find(p => (p.courses || []).includes(me.course.id));
  const seq = prog ? (prog.courses || []).flatMap(id => (courseOf(id) ? lessonsOf(courseOf(id)) : [])) : lessons;
  const i = seq.findIndex(l => l.slug === slug);
  return i > 0 ? seq[i - 1].slug : null;
}

// ---------- Layout: folding on desktop, drawers on phones ----------
const vmain = $("vmain");
const layout = store.get("ef-viewer-layout", {}) || {};
vmain.classList.toggle("lfold", !!layout.l);
vmain.classList.toggle("rfold", !!layout.r);
function fold(side, on) {
  vmain.classList.toggle(side + "fold", on);
  layout[side] = on;
  store.set("ef-viewer-layout", layout);
  const target = on ? document.querySelector(`[data-unfold="${side}"]`) : document.querySelector(`[data-fold="${side}"]`);
  if (target) target.focus();
}
document.querySelectorAll("[data-fold]").forEach(b => b.addEventListener("click", () => fold(b.dataset.fold, true)));
document.querySelectorAll("[data-unfold]").forEach(b => b.addEventListener("click", () => fold(b.dataset.unfold, false)));
function drawer(side, open) {
  vmain.classList.toggle("lopen", side === "l" && open);
  vmain.classList.toggle("ropen", side === "r" && open);
  $("open-lside").setAttribute("aria-expanded", String(side === "l" && open));
  $("open-rcol").setAttribute("aria-expanded", String(side === "r" && open));
  if (open) { const panel = side === "l" ? $("lside") : $("rcol"); const f = panel.querySelector("input, button"); if (f) f.focus(); }
}
const closeDrawers = () => { if (vmain.classList.contains("lopen") || vmain.classList.contains("ropen")) drawer(null, false); };
$("open-lside").addEventListener("click", () => drawer("l", !vmain.classList.contains("lopen")));
$("open-rcol").addEventListener("click", () => drawer("r", !vmain.classList.contains("ropen")));
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => { drawer(null, false); $(b.dataset.close === "l" ? "open-lside" : "open-rcol").focus(); }));
$("scrim").addEventListener("click", closeDrawers);

// ---------- Views ----------
let current = null; // { lesson (the file), meta, player }
const titleOf = s => s.heading || ({ intro: "Introduction", summary: "Summary", return: "How did it go?" }[s.type]) || "Step";

function header(title, sub) {
  $("v-title").textContent = title;
  $("v-sub").textContent = sub || "";
  document.title = title === "Your library" ? "Executive Frame Learning Hub" : `${title} | Executive Frame Learning Hub`;
}
function showSection(id) {
  ["home", "lesson", "missing"].forEach(s => { $(s).hidden = s !== id; });
}

function lessonButton(l) {
  const f = l.file;
  const p = progressLabel(l.slug, f.steps.length);
  const active = current && current.meta.slug === l.slug;
  let steps = "";
  if (active) {
    const st = current.player.state;
    steps = `<ol class="steplist" aria-label="Steps in ${esc(f.title)}">${f.steps.map((s, i) => `
      <li><button type="button" class="navbtn stepbtn${i > st.max ? " unseen" : ""}" data-step="${i}" ${i === st.step ? 'aria-current="step"' : ""}>${i + 1}. ${esc(titleOf(s))}</button></li>`).join("")}</ol>`;
  }
  return `<li><button type="button" class="navbtn titem" data-lesson="${esc(l.slug)}" ${active ? 'aria-current="page"' : ""}>
      <span class="ttitle">${esc(f.title)}</span><span class="tstate" data-state="${p.state}">${esc(p.text)}</span></button>${steps}</li>`;
}

function renderLibrary() {
  const q = $("find").value.trim().toLowerCase();
  let shown = 0;
  const match = l => !q || (l.file.title + " " + (l.file.summary || "") + " " + l.course.title).toLowerCase().includes(q);
  $("lesson-list").innerHTML = courses.map(c => {
    const ls = lessonsOf(c).filter(match);
    if (!ls.length) return "";
    shown += ls.length;
    return `<li class="cgroup"><p class="chead"><span>${esc(c.title)}</span><span class="t-caption">${LAYERS[c.layer] || ""}</span></p>
      <ul class="tlist">${ls.map(lessonButton).join("")}</ul></li>`;
  }).join("");
  $("find-none").hidden = shown > 0;
  $("go-home").setAttribute("aria-current", current ? "false" : "page");
}
$("find").addEventListener("input", renderLibrary);
$("lesson-list").addEventListener("click", e => {
  const t = e.target.closest("[data-lesson]");
  if (t) { openLesson(t.dataset.lesson, null, true); closeDrawers(); return; }
  const s = e.target.closest("[data-step]");
  if (s && current) { current.player.go(Number(s.dataset.step)); closeDrawers(); }
});
$("go-home").addEventListener("click", () => { openHome(true); closeDrawers(); });
document.querySelectorAll("[data-home]").forEach(b => b.addEventListener("click", () => openHome(true)));

function membershipText() {
  switch (access.state) {
    case "trialing": return `Your free trial runs until ${nzDate(access.trialEnd)}.`;
    case "active": return access.cancelAtPeriodEnd ? `Your plan is cancelled and access continues until ${nzDate(access.periodEnd)}.` : "Your membership is active.";
    case "past_due": return "Your last payment did not go through. Please update your card on My account.";
    case "organisation": return `Your place is provided by ${access.organisation.name}.`;
    case "preview": return "Local preview: membership is not checked and downloads are switched off.";
    default: return "";
  }
}

function lessonCard(l) {
  const f = l.file;
  const p = progressLabel(l.slug, f.steps.length);
  return `<li><a class="lesson-card" href="/hub/${encodeURIComponent(l.slug)}/" data-card="${esc(l.slug)}">
      <h5 class="t-heading">${esc(f.title)}</h5><p>${esc(f.summary || "")}</p>
      <span class="lesson-meta"><span class="tag">${esc(p.text)}</span>${f.minutes ? `<span class="t-caption">${esc(f.minutes)} minutes</span>` : ""}</span></a></li>`;
}
function courseGroup(c) {
  const ls = lessonsOf(c);
  if (!ls.length) return "";
  return `<section class="home-group" aria-label="${esc(c.title)}">
    <h4 class="t-heading">${esc(c.title)}</h4>${c.summary ? `<p class="muted">${esc(c.summary)}</p>` : ""}
    <ul class="home-grid">${ls.map(lessonCard).join("")}</ul></section>`;
}

function openHome(push, finishedSlug) {
  if (current) current = null;
  header("Your library", membershipText());
  const inProg = new Set(programmes.flatMap(p => p.courses || []));
  const tools = courses.filter(c => c.layer === "tool" && !inProg.has(c.id));
  const others = courses.filter(c => c.layer !== "tool" && !inProg.has(c.id));
  const progHtml = programmes.map(p => {
    const groups = (p.courses || []).map(id => courseOf(id)).filter(Boolean).map(courseGroup).join("");
    return groups ? `<section class="home-prog" aria-labelledby="prog-${esc(p.slug)}">
      <h3 class="t-title" id="prog-${esc(p.slug)}">${esc(p.title)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ""}${groups}</section>` : "";
  }).join("");
  const toolHtml = tools.length ? `<section class="home-prog" aria-labelledby="prog-tools"><h3 class="t-title" id="prog-tools">Tools</h3>
    <p>Single lessons to use on their own, whenever you need them.</p>${tools.map(courseGroup).join("")}</section>` : "";
  $("home-body").innerHTML = progHtml + toolHtml + others.map(courseGroup).join("");
  $("home-empty").hidden = lessons.length > 0;
  const done = finishedSlug && lessons.find(l => l.slug === finishedSlug);
  $("finished-note").hidden = !done;
  if (done) $("finished-note").textContent = `You have finished ${done.file.title}. You can open it again at any time.`;
  showSection("home");
  renderLibrary();
  renderReader();
  if (push) history.pushState(null, "", "/");
  if (done) $("finished-note").setAttribute("tabindex", "-1");
  if (push || done) $(done ? "finished-note" : "home-title").focus({ preventScroll: true });
}
$("home-body").addEventListener("click", e => {
  const a = e.target.closest("[data-card]");
  if (!a) return;
  e.preventDefault();
  openLesson(a.dataset.card, null, true);
});

function openLesson(slug, step, push) {
  const meta = lessons.find(l => l.slug === slug);
  if (!meta) {
    current = null;
    header("Lesson not available", "");
    $("missing-text").textContent = allCourses.some(c => (c.lessons || []).includes(slug))
      ? "This lesson is not part of your membership, or it is not published yet."
      : "This lesson could not be found. It may have moved.";
    showSection("missing");
    renderLibrary();
    renderReader();
    $("missing-title").focus();
    return;
  }
  const lesson = meta.file;
  header(lesson.title, lesson.summary);
  showSection("lesson");
  const player = createPlayer(lesson, access, { stage: $("stage"), bar: $("bar"), count: $("count"), prev: $("btn-prev"), next: $("btn-next") }, {
    onStep: i => {
      history.replaceState(null, "", `/hub/${lesson.slug}/#step-${i + 1}`);
      renderLibrary();
      renderReflections();
      $("main").scrollTop = 0;
    },
    onSave: () => renderReflections(),
    onFinish: () => openHome(true, lesson.slug)
  }, { prior: priorOf(slug) });
  current = { lesson, meta, player };
  if (push) history.pushState(null, "", `/hub/${lesson.slug}/`);
  renderReader();
  const start = Number.isInteger(step) ? step : player.state.step;
  player.go(start, !!push);
}

// ---------- Reader ----------
function renderReader() {
  const r = $("reader");
  if (!current) {
    $("reader-title").textContent = "Your membership";
    r.innerHTML = `
      <section class="rsec"><h3>Membership</h3><p>${esc(membershipText() || "Your membership details are on My account.")}</p>
        <a class="btn" href="/account/">My account</a></section>
      <section class="rsec"><h3>How the viewer works</h3>
        <p>Choose a lesson from the library. It opens one step at a time, and your notes, reflections and files for that lesson appear here.</p>
        <p class="t-caption muted">Your place, notes, reflections and plans are kept in this browser only.</p></section>`;
    return;
  }
  const t = current.lesson;
  const st = current.player.state;
  const downloads = t.steps.flatMap(s => s.type === "download" ? (s.files || []) : []);
  $("reader-title").textContent = "Notes and files";
  r.innerHTML = `
    <section class="rsec"><h3>About this lesson</h3><p>${esc(t.summary || "")}</p>
      <p class="t-caption">${esc(current.meta.course.title)}. ${t.steps.length} steps${t.minutes ? `, about ${esc(t.minutes)} minutes` : ""}${t.sample ? `. <span class="tag">Sample content</span>` : ""}</p></section>
    <section class="rsec"><h3><label for="notes">Your notes</label></h3>
      <textarea class="input" id="notes" placeholder="Anything you want to remember from this lesson.">${esc(st.notes)}</textarea>
      <p class="t-caption muted">Kept in this browser only.</p></section>
    <section class="rsec" id="reflections"></section>
    ${downloads.length ? `<section class="rsec"><h3>Files</h3>
      ${downloads.map(f => `<div class="rfile"><span class="t-ui">${esc(f.label)}</span><button class="btn" type="button" data-file="${esc(f.path)}">Download</button></div>`).join("")}
      <p class="msg" id="reader-dl-msg" role="status"></p>
      ${access.downloadLimit ? `<p class="t-caption muted" id="trial-dl">During your free trial you can download ${access.downloadLimit} files; ${Math.max(0, access.downloadLimit - (access.downloadsUsed || 0))} left.</p>` : ""}
    </section>` : ""}`;
  let tm = null;
  $("notes").addEventListener("input", e => { clearTimeout(tm); tm = setTimeout(() => current.player.setNotes(e.target.value), 300); });
  r.querySelectorAll("[data-file]").forEach(b => b.addEventListener("click", () => current.player.download(b, $("reader-dl-msg"))));
  renderReflections();
}
function renderReflections() {
  const box = $("reflections");
  if (!box || !current) return;
  const t = current.lesson, st = current.player.state;
  const items = t.steps.map((s, i) => ({ s, i })).filter(x => x.s.type === "reflect" || x.s.type === "return" || x.s.type === "plan");
  if (!items.length) { box.hidden = true; return; }
  box.hidden = false;
  const answer = ({ s, i }) => {
    if (s.type === "plan") {
      const p = st.plan[i];
      return p && (p.when || p.will) ? `<p>When ${esc(p.when || "")}, I will ${esc(p.will || "")}.</p>` : `<p class="t-caption muted">Not written yet.</p>`;
    }
    return st.reflect[i] ? `<p>${esc(st.reflect[i])}</p>` : `<p class="t-caption muted">Not written yet.</p>`;
  };
  box.innerHTML = `<h3>Your reflections and plans</h3>${items.map(x => `
    <div class="refl"><q>${esc(x.s.type === "plan" ? x.s.heading : x.s.prompt)}</q>
      ${answer(x)}
      ${st.step !== x.i ? `<button class="btn btn-quiet" type="button" data-goto="${x.i}">Open this step</button>` : ""}</div>`).join("")}`;
  box.querySelectorAll("[data-goto]").forEach(b => b.addEventListener("click", () => { current.player.go(Number(b.dataset.goto)); closeDrawers(); }));
}

// ---------- Account menu ----------
const menu = $("acct-menu"), acctBtn = $("acct-btn");
function setMenu(open) {
  menu.hidden = !open;
  acctBtn.setAttribute("aria-expanded", String(open));
  if (open) menu.querySelector("[role=menuitem]").focus();
}
acctBtn.addEventListener("click", () => setMenu(menu.hidden));
document.addEventListener("click", e => { if (!menu.hidden && !e.target.closest(".acct")) setMenu(false); });
menu.addEventListener("keydown", e => {
  const items = [...menu.querySelectorAll("[role=menuitem]")];
  const i = items.indexOf(document.activeElement);
  if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  if (e.key === "Escape") { setMenu(false); acctBtn.focus(); }
});

// ---------- Dialogs ----------
const openDialog = id => { setMenu(false); closeDrawers(); $(id).showModal(); };
$("btn-help").addEventListener("click", () => openDialog("dlg-help"));
$("menu-help").addEventListener("click", () => openDialog("dlg-help"));
document.querySelectorAll("[data-dialog-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));

const settings = store.get("ef-viewer-settings", {}) || {};
const form = $("form-settings");
form.weight.value = settings.weight || "light";
form.size.value = settings.size || "standard";
form.motion.value = settings.motion || "device";
form.addEventListener("change", () => {
  const s = { weight: form.weight.value, size: form.size.value, motion: form.motion.value };
  store.set("ef-viewer-settings", s);
  const c = document.documentElement.classList;
  c.toggle("text-regular", s.weight === "regular");
  c.toggle("text-large", s.size === "large");
  c.toggle("calm-motion", s.motion === "calm");
});
$("btn-settings").addEventListener("click", () => openDialog("dlg-settings"));

$("menu-logout").addEventListener("click", () => openDialog("dlg-logout"));
$("btn-logout").addEventListener("click", async () => {
  if ($("logout-clear").checked) {
    allCourses.flatMap(c => c.lessons || []).forEach(slug => store.remove(lessonKey(slug)));
    ["ef-viewer-layout", "ef-viewer-settings"].forEach(k => store.remove(k));
  }
  try { await logOut(); } catch (err) { /* already signed out */ }
  location.assign("/login/?signedout=1");
});

// ---------- Keyboard ----------
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { closeDrawers(); if (!menu.hidden) { setMenu(false); acctBtn.focus(); } return; }
  if (!current || e.altKey || e.ctrlKey || e.metaKey) return;
  if (document.querySelector("dialog[open]") || e.target.closest("input, textarea, select, [contenteditable], [role=menu]")) return;
  if (e.key === "ArrowRight") { e.preventDefault(); current.player.next(); }
  if (e.key === "ArrowLeft") { e.preventDefault(); current.player.prev(); }
});
$("btn-next").addEventListener("click", () => current && current.player.next());
$("btn-prev").addEventListener("click", () => current && current.player.prev());

// ---------- Routing ----------
function route(push) {
  const m = location.pathname.match(/^\/hub\/([a-z0-9-]+)\/?$/);
  if (m) {
    const step = (location.hash.match(/^#step-(\d+)$/) || [])[1];
    openLesson(m[1], step ? Number(step) - 1 : null, push);
  } else {
    openHome(false, params.get("finished"));
  }
}
window.addEventListener("popstate", () => route(false));

$("cover").hidden = true;
$("app").hidden = false;
route(false);
