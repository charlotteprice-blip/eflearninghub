// The Learning Hub viewer: one full-window app for members, after the Themescape viewer.
// Left: the library (topics, the open topic's steps, help, settings, account menu).
// Middle: the stage, showing one step at a time (player.js).
// Right: notes and files for the open topic (about, notes, reflections, downloads).
// Addresses: / and /library/ show all topics; /hub/<slug>/#step-3 opens a topic at a step. These never change,
// because the Client Hub links to them. Everything a learner writes stays in this browser.

import { requireMember } from "./gate.js";
import { logOut } from "./app.js";
import { $, store, params, nzDate } from "./ui.js";
import { placeMark } from "./layout.js";
import { createPlayer, progressLabel, topicKey, esc } from "./player.js";

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
const index = await fetch("/content/topics.json", { cache: "no-cache" }).then(r => r.json());
const inMembership = t => {
  const arms = Array.isArray(t.arms) && t.arms.length ? t.arms : ["all"];
  return arms.includes("all") || !access.arms || access.arms === "all" || arms.some(a => access.arms.includes(a));
};
const topics = index.topics.filter(t => t.status !== "draft" && inMembership(t));
// Topic files are small, so they load together at the start; the library then knows every step count.
const files = {};
await Promise.all(topics.map(async t => {
  try {
    const res = await fetch(`/content/topics/${t.slug}.json`, { cache: "no-cache" });
    if (res.ok) files[t.slug] = await res.json();
  } catch (err) { console.warn("Topic not loaded", t.slug); }
}));

// ---------- Layout: folding on desktop, drawers on phones ----------
const vmain = $("vmain");
const phone = () => matchMedia("(max-width: 899px)").matches;
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
let current = null; // { topic, player }
const titleOf = s => s.heading || ({ intro: "Introduction", summary: "Summary" }[s.type]) || "Step";

function header(title, sub) {
  $("v-title").textContent = title;
  $("v-sub").textContent = sub || "";
  document.title = title === "Your library" ? "Executive Frame Learning Hub" : `${title} | Executive Frame Learning Hub`;
}
function showSection(id) {
  ["home", "topic", "missing"].forEach(s => { $(s).hidden = s !== id; });
}

function renderLibrary() {
  const q = $("find").value.trim().toLowerCase();
  let shown = 0;
  $("topic-list").innerHTML = topics.map(t => {
    const f = files[t.slug];
    const match = !q || (t.title + " " + (t.summary || "")).toLowerCase().includes(q);
    if (!match) return "";
    shown++;
    const total = f ? f.steps.length : 0;
    const p = progressLabel(t.slug, total);
    const active = current && current.topic.slug === t.slug;
    let steps = "";
    if (active && f) {
      const st = current.player.state;
      steps = `<ol class="steplist" aria-label="Steps in ${esc(t.title)}">${f.steps.map((s, i) => `
        <li><button type="button" class="navbtn stepbtn${i > st.max ? " unseen" : ""}" data-step="${i}" ${i === st.step ? 'aria-current="step"' : ""}>${i + 1}. ${esc(titleOf(s))}</button></li>`).join("")}</ol>`;
    }
    return `<li><button type="button" class="navbtn titem" data-topic="${esc(t.slug)}" ${active ? 'aria-current="page"' : ""}>
        <span class="ttitle">${esc(t.title)}</span><span class="tstate" data-state="${p.state}">${esc(p.text)}</span></button>${steps}</li>`;
  }).join("");
  $("find-none").hidden = shown > 0;
  $("go-home").setAttribute("aria-current", current ? "false" : "page");
}
$("find").addEventListener("input", renderLibrary);
$("topic-list").addEventListener("click", e => {
  const t = e.target.closest("[data-topic]");
  if (t) { openTopic(t.dataset.topic, null, true); closeDrawers(); return; }
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

function openHome(push, finishedSlug) {
  if (current) current = null;
  header("Your library", membershipText());
  $("home-grid").innerHTML = topics.map(t => {
    const f = files[t.slug];
    const p = progressLabel(t.slug, f ? f.steps.length : 0);
    return `<li><a class="topic-card" href="/hub/${encodeURIComponent(t.slug)}/" data-card="${esc(t.slug)}">
        <h3 class="t-heading">${esc(t.title)}</h3><p>${esc(t.summary)}</p>
        <span class="topic-meta"><span class="tag">${esc(p.text)}</span>${t.minutes ? `<span class="t-caption">${esc(t.minutes)} minutes</span>` : ""}</span></a></li>`;
  }).join("");
  $("home-empty").hidden = topics.length > 0;
  const done = finishedSlug && topics.find(t => t.slug === finishedSlug);
  $("finished-note").hidden = !done;
  if (done) $("finished-note").textContent = `You have finished ${done.title}. You can open it again at any time.`;
  showSection("home");
  renderLibrary();
  renderReader();
  if (push) history.pushState(null, "", "/");
  if (done) $("finished-note").setAttribute("tabindex", "-1");
  if (push || done) $(done ? "finished-note" : "home-title").focus({ preventScroll: true });
}
$("home-grid").addEventListener("click", e => {
  const a = e.target.closest("[data-card]");
  if (!a) return;
  e.preventDefault();
  openTopic(a.dataset.card, null, true);
});

function openTopic(slug, step, push) {
  const meta = topics.find(t => t.slug === slug);
  const topic = files[slug];
  if (!meta || !topic || !Array.isArray(topic.steps) || !topic.steps.length) {
    current = null;
    header("Topic not available", "");
    $("missing-text").textContent = index.topics.some(t => t.slug === slug)
      ? "This topic is not part of your membership."
      : "This topic could not be found. It may have moved.";
    showSection("missing");
    renderLibrary();
    renderReader();
    $("missing-title").focus();
    return;
  }
  header(topic.title, topic.summary);
  showSection("topic");
  const player = createPlayer(topic, access, { stage: $("stage"), bar: $("bar"), count: $("count"), prev: $("btn-prev"), next: $("btn-next") }, {
    onStep: i => {
      history.replaceState(null, "", `/hub/${topic.slug}/#step-${i + 1}`);
      renderLibrary();
      renderReflections();
      $("main").scrollTop = 0;
    },
    onSave: () => renderReflections(),
    onFinish: () => openHome(true, topic.slug)
  });
  current = { topic, player };
  if (push) history.pushState(null, "", `/hub/${topic.slug}/`);
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
        <p>Choose a topic from the library. It opens one step at a time, and your notes, reflections and files for that topic appear here.</p>
        <p class="t-caption muted">Your place, notes and reflections are kept in this browser only.</p></section>`;
    return;
  }
  const t = current.topic;
  const st = current.player.state;
  const downloads = t.steps.flatMap(s => s.type === "download" ? (s.files || []) : []);
  $("reader-title").textContent = "Notes and files";
  r.innerHTML = `
    <section class="rsec"><h3>About this topic</h3><p>${esc(t.summary)}</p>
      <p class="t-caption">${t.steps.length} steps${t.minutes ? `, about ${esc(t.minutes)} minutes` : ""}${t.sample ? `. <span class="tag">Sample content</span>` : ""}</p></section>
    <section class="rsec"><h3><label for="notes">Your notes</label></h3>
      <textarea class="input" id="notes" placeholder="Anything you want to remember from this topic.">${esc(st.notes)}</textarea>
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
  const t = current.topic, st = current.player.state;
  const items = t.steps.map((s, i) => ({ s, i })).filter(x => x.s.type === "reflect");
  if (!items.length) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<h3>Your reflections</h3>${items.map(({ s, i }) => `
    <div class="refl"><q>${esc(s.prompt)}</q>
      ${st.reflect[i] ? `<p>${esc(st.reflect[i])}</p>` : `<p class="t-caption muted">Not written yet.</p>`}
      ${st.step !== i ? `<button class="btn btn-quiet" type="button" data-goto="${i}">Open this step</button>` : ""}</div>`).join("")}`;
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
    index.topics.forEach(t => store.remove(topicKey(t.slug)));
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
    openTopic(m[1], step ? Number(step) - 1 : null, push);
  } else {
    openHome(false, params.get("finished"));
  }
}
window.addEventListener("popstate", () => route(false));

$("cover").hidden = true;
$("app").hidden = false;
route(false);
