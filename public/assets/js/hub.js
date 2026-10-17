// Topic hub template. /hub/<slug>/ shows /content/topics/<slug>.json, one step at a time.
// Step types: intro, text, frame (rotating triangle, one panel per point, draggable), sort (drag moments into groups),
// reflect (notes kept in this browser only), workshop (video loads only when played), download (signed link from
// getDownloadLink) and summary. The format is described in docs/content-format.md.
// Progress, sort answers and reflections stay in this browser. Nothing a learner writes is sent anywhere.
// #step-3 at the end of the address opens step 3, so the Client Hub can link to a particular step.

import { requireMember } from "./gate.js";
import { call, explainCallError } from "./app.js";
import { $, show, store } from "./ui.js";
import { placeMark } from "./layout.js";

const VIEWS = ["v-loading", "v-missing", "v-hub"];
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });

const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const paras = body => (Array.isArray(body) ? body : body ? [body] : []).map(p => `<p>${esc(p)}</p>`).join("");
const mod = (a, n) => ((a % n) + n) % n;

function missing(text) {
  if (text) $("missing-text").textContent = text;
  show(VIEWS, "v-missing", "missing-title");
}

const slug = (location.pathname.match(/^\/hub\/([a-z0-9-]+)\/?$/) || [])[1];
const { access } = await requireMember();

let topic = null;
if (slug) {
  try {
    const res = await fetch(`/content/topics/${slug}.json`, { cache: "no-cache" });
    if (res.ok) topic = await res.json();
  } catch (err) { console.warn("Topic not loaded", err); }
}
const allowed = t => {
  const topicArms = Array.isArray(t.arms) && t.arms.length ? t.arms : ["all"];
  if (topicArms.includes("all") || !access.arms || access.arms === "all") return true;
  return topicArms.some(a => access.arms.includes(a));
};

if (!topic || !Array.isArray(topic.steps) || !topic.steps.length) {
  missing("This topic could not be found. It may have moved.");
} else if (!allowed(topic)) {
  missing("This topic is not part of your membership.");
} else {
  start();
}

function start() {
  document.title = `${topic.title} | Executive Frame Learning Hub`;
  $("hub-title").textContent = topic.title;
  $("hub-tags").innerHTML = (topic.minutes ? `<span class="tag">${esc(topic.minutes)} minutes</span> ` : "") +
    (topic.sample ? `<span class="tag">Sample content</span>` : "");

  const KEY = `ef-hub-${topic.slug}`;
  const saved = store.get(KEY, {}) || {};
  const state = {
    step: Number.isInteger(saved.step) ? saved.step : 0,
    sub: saved.sub || {},
    sort: saved.sort || {},
    reflect: saved.reflect || {},
    done: !!saved.done
  };
  const fromHash = (location.hash.match(/^#step-(\d+)$/) || [])[1];
  if (fromHash) state.step = Number(fromHash) - 1;
  state.step = Math.min(Math.max(0, state.step), topic.steps.length - 1);
  const save = () => store.set(KEY, state);

  const stage = $("stage");
  let frame = null; // live frame controller for the current step

  // ---------- Renderers ----------
  const R = {
    intro: s => `<h2 class="t-display">${esc(s.heading || topic.title)}</h2>${paras(s.body)}`,
    text: s => `<h2 class="t-title">${esc(s.heading)}</h2>${paras(s.body)}`,
    summary: s => `<h2 class="t-title">${esc(s.heading)}</h2>
      <ul class="points">${(s.points || []).map(p => `<li>${esc(p)}</li>`).join("")}</ul>`,
    reflect: (s, i) => `<h2 class="t-title">${esc(s.heading)}</h2>
      <div class="reflect field">
        <label class="field-label" for="reflect-${i}">${esc(s.prompt)}</label>
        <textarea class="input" id="reflect-${i}" placeholder="${esc(s.placeholder || "")}">${esc(state.reflect[i] || "")}</textarea>
        <span class="field-hint">Kept in this browser only. It is not sent to Executive Frame or anyone else.</span>
      </div>`,
    workshop: s => {
      const v = s.video || {};
      const playable = v.id && (v.provider === "youtube" || v.provider === "vimeo");
      return `<h2 class="t-title">${esc(s.heading)}</h2>${paras(s.body)}
        ${s.duration ? `<p class="t-caption">${esc(s.duration)}</p>` : ""}
        <div class="video" id="video">${playable
          ? `<button class="btn btn-primary" type="button" id="btn-play">Play the workshop</button>`
          : `<p class="placeholder" style="color:inherit;background:transparent">The workshop video will appear here.</p>`}</div>
        ${playable ? `<p class="t-caption" style="margin-top:var(--space-2)">The video is hosted by ${v.provider === "youtube" ? "YouTube" : "Vimeo"} and loads only when you press play.</p>` : ""}`;
    },
    download: s => `<h2 class="t-title">${esc(s.heading)}</h2>${paras(s.body)}
      <div class="stack">${(s.files || []).map(f => `
        <div class="file-row">
          <span class="t-ui">${esc(f.label)}${f.pages ? ` <span class="t-caption muted">${esc(f.pages)} pages</span>` : ""}</span>
          <button class="btn" type="button" data-file="${esc(f.path)}">Download</button>
        </div>`).join("")}</div>
      <p id="dl-msg" class="msg" role="status" style="margin-top:var(--space-4)"></p>
      ${access.downloadLimit ? `<p class="t-caption" style="margin-top:var(--space-3)">During your free trial you can download ${access.downloadLimit} files; ${Math.max(0, access.downloadLimit - (access.downloadsUsed || 0))} left.</p>` : ""}`,
    frame: (s, i) => {
      const n = s.points.length, stepDeg = 360 / n, r = 92;
      const pts = s.points.map((p, k) => {
        const a = (-90 + k * stepDeg) * Math.PI / 180;
        return { x: +(r * Math.cos(a)).toFixed(2), y: +(r * Math.sin(a)).toFixed(2), label: p.label };
      });
      return `<h2 class="t-title">${esc(s.heading)}</h2>${s.intro ? `<p>${esc(s.intro)}</p>` : ""}
        <div class="frame">
          <svg class="frame-svg" id="frame-svg" viewBox="-150 -150 300 300" aria-label="${esc(s.heading)}, ${n} points. Drag to turn, or select a point.">
            <circle class="frame-ring" r="128"></circle>
            <g class="frame-rotor" id="frame-rotor">
              <polygon class="frame-edge" points="${pts.map(p => `${p.x},${p.y}`).join(" ")}"></polygon>
              ${pts.map((p, k) => `
                <g class="frame-node" data-node="${k}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" aria-label="${esc(p.label)}">
                  <g class="frame-node-inner"><circle r="40"></circle><text>${esc(p.label)}</text></g>
                </g>`).join("")}
            </g>
          </svg>
          <div class="frame-panel" id="frame-panel" aria-live="polite"></div>
        </div>`;
    },
    sort: (s, i) => {
      const st = state.sort[i] || (state.sort[i] = { at: {}, checked: false });
      const item = k => {
        const it = s.items[k];
        let verdict = "";
        if (st.checked && st.at[k] && it.category) {
          const right = st.at[k] === it.category;
          const label = (s.categories.find(c => c.id === it.category) || {}).label || "";
          verdict = `<span class="verdict">${right ? "Matches the suggested group" : `Suggested group: ${esc(label)}`}</span>`;
        }
        const wrong = st.checked && st.at[k] && it.category && st.at[k] !== it.category;
        return `<li><button type="button" class="sort-item${wrong ? " wrong" : ""}" data-item="${k}" aria-pressed="false">${esc(it.text)}${verdict}</button></li>`;
      };
      const inPool = s.items.map((_, k) => k).filter(k => !st.at[k]);
      const answerable = s.items.every(it => it.category);
      return `<h2 class="t-title">${esc(s.heading)}</h2>${s.instructions ? `<p>${esc(s.instructions)}</p>` : ""}
        <div class="sort" id="sort">
          <div class="sort-pool sort-zone" data-zone="">
            <div class="sort-zone-head"><span class="t-ui-strong">Moments to place</span>
              <button class="btn btn-quiet" type="button" data-place="" hidden>Return here</button></div>
            <ul class="sort-list">${inPool.map(item).join("") || `<li class="t-caption muted">All placed.</li>`}</ul>
          </div>
          <div class="sort-zones">${s.categories.map(c => `
            <div class="sort-zone" data-zone="${esc(c.id)}">
              <div class="sort-zone-head"><span class="t-ui-strong">${esc(c.label)}</span>
                <button class="btn btn-quiet" type="button" data-place="${esc(c.id)}" hidden>Place here</button></div>
              <ul class="sort-list">${s.items.map((_, k) => k).filter(k => st.at[k] === c.id).map(item).join("")}</ul>
            </div>`).join("")}</div>
          ${answerable ? `<div class="btn-row"><button class="btn" type="button" id="btn-check" ${inPool.length ? "disabled" : ""}>Check my groups</button></div>` : ""}
          ${st.checked && s.feedback ? `<p class="notice">${esc(s.feedback)}</p>` : ""}
        </div>`;
    }
  };

  // ---------- Behaviour after rendering ----------
  const A = {
    reflect: (s, i) => {
      let t = null;
      $(`reflect-${i}`).addEventListener("input", e => {
        clearTimeout(t);
        t = setTimeout(() => { state.reflect[i] = e.target.value.slice(0, 10000); save(); }, 300);
      });
    },
    workshop: s => {
      const b = $("btn-play");
      if (!b) return;
      b.addEventListener("click", () => {
        const v = s.video;
        const src = v.provider === "youtube"
          ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0`
          : `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?autoplay=1&dnt=1`;
        $("video").innerHTML = `<iframe src="${src}" title="${esc(s.heading)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      });
    },
    download: () => {
      stage.querySelectorAll("[data-file]").forEach(b => b.addEventListener("click", async () => {
        const msg = $("dl-msg");
        msg.classList.remove("ok");
        if (access.preview) { msg.textContent = "Downloads are switched off in the local preview."; return; }
        b.disabled = true;
        msg.classList.add("ok");
        msg.textContent = "Preparing your download";
        try {
          const res = await call("getDownloadLink", { path: b.dataset.file });
          if (typeof res.downloadsUsed === "number") access.downloadsUsed = res.downloadsUsed;
          msg.textContent = "Your download has started.";
          location.assign(res.url);
        } catch (err) {
          msg.classList.remove("ok");
          msg.textContent = explainCallError(err, "The file could not be prepared just now. Please try again in a moment.");
        } finally {
          b.disabled = false;
        }
      }));
    },
    frame: (s, i) => { frame = frameController(s, i); },
    sort: (s, i) => sortController(s, i)
  };

  // ---------- Frame: rotating triangle ----------
  function frameController(s, i) {
    const n = s.points.length, stepDeg = 360 / n;
    const svg = $("frame-svg"), rotor = $("frame-rotor");
    const nodes = [...svg.querySelectorAll("[data-node]")];
    let angle = 0;
    const apply = () => {
      rotor.style.transform = `rotate(${angle}deg)`;
      nodes.forEach(nd => { nd.firstElementChild.style.transform = `rotate(${-angle}deg)`; });
    };
    function set(k, focusNode) {
      k = mod(k, n);
      state.sub[i] = k;
      save();
      const target = -k * stepDeg;
      angle = target + 360 * Math.round((angle - target) / 360);
      apply();
      nodes.forEach((nd, j) => nd.setAttribute("aria-current", String(j === k)));
      const p = s.points[k];
      $("frame-panel").innerHTML = `<p class="t-caption">${k + 1} of ${n}</p><h3 class="t-heading">${esc(p.label)}</h3><p>${esc(p.body)}</p>
        ${k === 0 ? `<p class="frame-hint t-caption muted">Turn the triangle by dragging it, or press Next.</p>` : ""}`;
      if (focusNode) nodes[k].focus();
      updateCount();
    }
    // Drag to turn; letting go settles on the nearest point.
    let drag = null;
    svg.addEventListener("pointerdown", e => {
      const box = svg.getBoundingClientRect();
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
      drag = { cx, cy, a0: Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI, base: angle, moved: 0, node: e.target.closest("[data-node]") };
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener("pointermove", e => {
      if (!drag) return;
      let d = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * 180 / Math.PI - drag.a0;
      d = mod(d + 180, 360) - 180;
      drag.moved = Math.max(drag.moved, Math.abs(d));
      if (drag.moved < 4) return;
      svg.classList.add("dragging");
      angle = drag.base + d;
      apply();
    });
    const end = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      svg.classList.remove("dragging");
      if (d.moved < 4) { if (d.node) set(Number(d.node.dataset.node), true); return; }
      set(Math.round(-angle / stepDeg));
    };
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    nodes.forEach(nd => nd.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(Number(nd.dataset.node), true); }
    }));
    angle = -(state.sub[i] || 0) * stepDeg;
    apply();
    set(state.sub[i] || 0);
    return { get: () => state.sub[i] || 0, set, n };
  }

  // ---------- Sort: drag moments into groups ----------
  function sortController(s, i) {
    const root = $("sort");
    const st = state.sort[i];
    let selected = null;
    const placeButtons = () => root.querySelectorAll("[data-place]");
    function select(k) {
      selected = selected === k ? null : k;
      root.querySelectorAll("[data-item]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.item) === selected)));
      placeButtons().forEach(b => {
        const here = b.dataset.place === "" ? !st.at[selected] : st.at[selected] === b.dataset.place;
        b.hidden = selected === null || here;
      });
      root.querySelectorAll(".sort-zone").forEach(z => z.classList.toggle("ready", selected !== null && !z.querySelector(`[data-place]`)?.hidden));
    }
    function place(k, zone) {
      if (zone) st.at[k] = zone; else delete st.at[k];
      st.checked = false;
      save();
      render(false);
      const moved = stage.querySelector(`[data-item="${k}"]`);
      if (moved) moved.focus();
    }
    root.addEventListener("click", e => {
      const p = e.target.closest("[data-place]");
      if (p && selected !== null) { place(selected, p.dataset.place); return; }
      const b = e.target.closest("[data-item]");
      if (b && !b.dataset.dragged) select(Number(b.dataset.item));
      if (b) delete b.dataset.dragged;
    });
    const check = $("btn-check");
    if (check) check.addEventListener("click", () => { st.checked = true; save(); render(false); });

    // Pointer dragging, for mouse, pen and touch.
    root.querySelectorAll("[data-item]").forEach(b => {
      let d = null;
      b.addEventListener("pointerdown", e => {
        if (e.button !== 0) return;
        d = { x: e.clientX, y: e.clientY, ghost: null, zone: null };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointermove", e => {
        if (!d) return;
        if (!d.ghost) {
          if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
          const box = b.getBoundingClientRect();
          d.ghost = b.cloneNode(true);
          d.ghost.classList.add("sort-ghost");
          d.ghost.style.width = box.width + "px";
          d.dx = e.clientX - box.left; d.dy = e.clientY - box.top;
          document.body.appendChild(d.ghost);
          b.classList.add("lifted");
        }
        d.ghost.style.left = (e.clientX - d.dx) + "px";
        d.ghost.style.top = (e.clientY - d.dy) + "px";
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const zone = under && under.closest(".sort-zone");
        root.querySelectorAll(".sort-zone").forEach(z => z.classList.toggle("over", z === zone));
        d.zone = zone;
      });
      const finish = () => {
        if (!d) return;
        const was = d;
        d = null;
        if (!was.ghost) return;
        was.ghost.remove();
        b.classList.remove("lifted");
        b.dataset.dragged = "1";
        root.querySelectorAll(".sort-zone").forEach(z => z.classList.remove("over"));
        if (was.zone) place(Number(b.dataset.item), was.zone.dataset.zone);
      };
      b.addEventListener("pointerup", finish);
      b.addEventListener("pointercancel", finish);
    });
  }

  // ---------- Stepping ----------
  function updateCount() {
    const n = topic.steps.length;
    const s = topic.steps[state.step];
    const within = s.type === "frame" ? (state.sub[state.step] || 0) / s.points.length : 0;
    $("hub-bar").style.width = `${((state.step + within + (state.step === n - 1 ? 1 : 0.5)) / n) * 100}%`;
    $("hub-count").textContent = `Step ${state.step + 1} of ${n}`;
    $("btn-prev").disabled = state.step === 0 && !(s.type === "frame" && (state.sub[state.step] || 0) > 0);
    $("btn-next").textContent = state.step === n - 1 ? "Finish" : "Next";
  }
  function render(focus = true) {
    const s = topic.steps[state.step];
    frame = null;
    stage.innerHTML = (R[s.type] || R.text)(s, state.step);
    if (A[s.type]) A[s.type](s, state.step);
    updateCount();
    if (focus) {
      stage.classList.remove("step-enter"); void stage.offsetWidth; stage.classList.add("step-enter");
      const h = stage.querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      if (stage.getBoundingClientRect().top < 0) stage.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    history.replaceState(null, "", `#step-${state.step + 1}`);
    save();
  }
  function next() {
    const s = topic.steps[state.step];
    if (frame && frame.get() < frame.n - 1) { frame.set(frame.get() + 1); return; }
    if (state.step < topic.steps.length - 1) { state.step++; render(); return; }
    state.done = true;
    save();
    location.assign("/library/?finished=" + encodeURIComponent(topic.slug));
  }
  function prev() {
    if (frame && frame.get() > 0) { frame.set(frame.get() - 1); return; }
    if (state.step === 0) return;
    state.step--;
    const s = topic.steps[state.step];
    if (s.type === "frame") state.sub[state.step] = s.points.length - 1;
    render();
  }
  $("btn-next").addEventListener("click", next);
  $("btn-prev").addEventListener("click", prev);
  document.addEventListener("keydown", e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
  });

  show(VIEWS, "v-hub");
  render(false);
}
