// Topic player: shows one topic, one step at a time, inside the viewer's stage.
// Step types: intro, text, frame (rotating triangle, one panel per point, draggable), sort (drag moments into groups),
// reflect (kept in this browser only), workshop (video loads only when played), download (signed link from
// getDownloadLink) and summary. The content format is in docs/content-format.md.
// Progress, sort answers, reflections and notes stay in this browser under ef-hub-<slug>. Nothing is sent anywhere.

import { call, explainCallError } from "./app.js";
import { store } from "./ui.js";

export const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const paras = body => (Array.isArray(body) ? body : body ? [body] : []).map(p => `<p>${esc(p)}</p>`).join("");
const mod = (a, n) => ((a % n) + n) % n;

export const topicKey = slug => `ef-hub-${slug}`;
export function loadState(slug) {
  const s = store.get(topicKey(slug), {}) || {};
  return {
    step: Number.isInteger(s.step) ? s.step : 0,
    max: Number.isInteger(s.max) ? s.max : (Number.isInteger(s.step) ? s.step : 0),
    sub: s.sub || {}, sort: s.sort || {}, reflect: s.reflect || {},
    notes: typeof s.notes === "string" ? s.notes : "",
    done: !!s.done,
    started: !!s.started || Number.isInteger(s.step)
  };
}
export function progressLabel(slug, total) {
  const raw = store.get(topicKey(slug));
  if (!raw) return { text: "Not started", state: "new" };
  const s = loadState(slug);
  if (s.done) return { text: "Finished", state: "done" };
  return { text: `Step ${s.step + 1} of ${total || "?"}`, state: "going" };
}

// els: { stage, bar, count, prev, next }   hooks: { onStep(i), onFinish(), onSave(state) }
export function createPlayer(topic, access, els, hooks = {}) {
  const state = loadState(topic.slug);
  state.started = true;
  const save = () => { store.set(topicKey(topic.slug), state); if (hooks.onSave) hooks.onSave(state); };
  const { stage } = els;
  let frame = null;

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
        <div class="video" data-video>${playable
          ? `<button class="btn btn-primary" type="button" data-play>Play the workshop</button>`
          : `<p>The workshop video will appear here.</p>`}</div>
        ${playable ? `<p class="t-caption" style="margin-top:var(--space-2)">The video is hosted by ${v.provider === "youtube" ? "YouTube" : "Vimeo"} and loads only when you press play.</p>` : ""}`;
    },
    download: s => `<h2 class="t-title">${esc(s.heading)}</h2>${paras(s.body)}
      <div class="stack">${(s.files || []).map(f => `
        <div class="file-row">
          <span class="t-ui">${esc(f.label)}${f.pages ? ` <span class="t-caption muted">${esc(f.pages)} pages</span>` : ""}</span>
          <button class="btn" type="button" data-file="${esc(f.path)}">Download</button>
        </div>`).join("")}</div>
      <p class="msg" data-dl-msg role="status" style="margin-top:var(--space-4)"></p>`,
    frame: s => {
      const n = s.points.length, stepDeg = 360 / n, r = 92;
      const pts = s.points.map((p, k) => {
        const a = (-90 + k * stepDeg) * Math.PI / 180;
        return { x: +(r * Math.cos(a)).toFixed(2), y: +(r * Math.sin(a)).toFixed(2), label: p.label };
      });
      return `<h2 class="t-title">${esc(s.heading)}</h2>${s.intro ? `<p>${esc(s.intro)}</p>` : ""}
        <div class="frame">
          <svg class="frame-svg" data-frame-svg viewBox="-150 -150 300 300" aria-label="${esc(s.heading)}, ${n} points. Drag to turn, or select a point.">
            <circle class="frame-ring" r="128"></circle>
            <g class="frame-rotor" data-rotor>
              <polygon class="frame-edge" points="${pts.map(p => `${p.x},${p.y}`).join(" ")}"></polygon>
              ${pts.map((p, k) => `
                <g class="frame-node" data-node="${k}" transform="translate(${p.x} ${p.y})" role="button" tabindex="0" aria-label="${esc(p.label)}">
                  <g class="frame-node-inner"><circle r="40"></circle><text>${esc(p.label)}</text></g>
                </g>`).join("")}
            </g>
          </svg>
          <div class="frame-panel" data-frame-panel aria-live="polite"></div>
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
        <div class="sort" data-sort>
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
          ${answerable ? `<div class="btn-row"><button class="btn" type="button" data-check ${inPool.length ? "disabled" : ""}>Check my groups</button></div>` : ""}
          ${st.checked && s.feedback ? `<p class="notice">${esc(s.feedback)}</p>` : ""}
        </div>`;
    }
  };

  const q = sel => stage.querySelector(sel);
  const A = {
    reflect: (s, i) => {
      let t = null;
      q(`#reflect-${i}`).addEventListener("input", e => {
        clearTimeout(t);
        t = setTimeout(() => { state.reflect[i] = e.target.value.slice(0, 10000); save(); }, 300);
      });
    },
    workshop: s => {
      const b = q("[data-play]");
      if (!b) return;
      b.addEventListener("click", () => {
        const v = s.video;
        const src = v.provider === "youtube"
          ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0`
          : `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?autoplay=1&dnt=1`;
        q("[data-video]").innerHTML = `<iframe src="${src}" title="${esc(s.heading)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
      });
    },
    download: () => {
      stage.querySelectorAll("[data-file]").forEach(b => b.addEventListener("click", () => download(b, q("[data-dl-msg]"))));
    },
    frame: (s, i) => { frame = frameController(s, i); },
    sort: (s, i) => sortController(s, i)
  };

  // Downloads, shared with the reader's Files list.
  async function download(button, msg) {
    msg.classList.remove("ok");
    if (access.preview) { msg.textContent = "Downloads are switched off in the local preview."; return; }
    button.disabled = true;
    msg.classList.add("ok");
    msg.textContent = "Preparing your download";
    try {
      const res = await call("getDownloadLink", { path: button.dataset.file });
      if (typeof res.downloadsUsed === "number") access.downloadsUsed = res.downloadsUsed;
      msg.textContent = "Your download has started.";
      location.assign(res.url);
    } catch (err) {
      msg.classList.remove("ok");
      msg.textContent = explainCallError(err, "The file could not be prepared just now. Please try again in a moment.");
    } finally {
      button.disabled = false;
    }
  }

  function frameController(s, i) {
    const n = s.points.length, stepDeg = 360 / n;
    const svg = q("[data-frame-svg]"), rotor = q("[data-rotor]");
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
      q("[data-frame-panel]").innerHTML = `<p class="t-caption">${k + 1} of ${n}</p><h3 class="t-heading">${esc(p.label)}</h3><p>${esc(p.body)}</p>
        ${k === 0 ? `<p class="frame-hint t-caption muted">Turn the triangle by dragging it, or press Next.</p>` : ""}`;
      if (focusNode) nodes[k].focus();
      update();
    }
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

  function sortController(s, i) {
    const root = q("[data-sort]");
    const st = state.sort[i];
    let selected = null;
    function select(k) {
      selected = selected === k ? null : k;
      root.querySelectorAll("[data-item]").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.item) === selected)));
      root.querySelectorAll("[data-place]").forEach(b => {
        const here = b.dataset.place === "" ? !st.at[selected] : st.at[selected] === b.dataset.place;
        b.hidden = selected === null || here;
      });
      root.querySelectorAll(".sort-zone").forEach(z => { const b = z.querySelector("[data-place]"); z.classList.toggle("ready", selected !== null && b && !b.hidden); });
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
    const check = root.querySelector("[data-check]");
    if (check) check.addEventListener("click", () => { st.checked = true; save(); render(false); });
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

  function update() {
    const n = topic.steps.length;
    const s = topic.steps[state.step];
    const within = s.type === "frame" ? (state.sub[state.step] || 0) / s.points.length : 0;
    els.bar.style.width = `${((state.step + within + (state.step === n - 1 ? 1 : 0.5)) / n) * 100}%`;
    els.count.textContent = `Step ${state.step + 1} of ${n}`;
    els.prev.disabled = state.step === 0 && !(s.type === "frame" && (state.sub[state.step] || 0) > 0);
    els.next.textContent = state.step === n - 1 ? "Finish" : "Next";
  }
  function render(focus = true) {
    const s = topic.steps[state.step];
    frame = null;
    state.max = Math.max(state.max, state.step);
    stage.innerHTML = (R[s.type] || R.text)(s, state.step);
    if (A[s.type]) A[s.type](s, state.step);
    update();
    if (focus) {
      stage.classList.remove("step-enter"); void stage.offsetWidth; stage.classList.add("step-enter");
      const h = stage.querySelector("h2");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }
    save();
    if (hooks.onStep) hooks.onStep(state.step);
  }
  function go(i, focus = true) {
    state.step = Math.min(Math.max(0, i), topic.steps.length - 1);
    render(focus);
  }
  function next() {
    if (frame && frame.get() < frame.n - 1) { frame.set(frame.get() + 1); return; }
    if (state.step < topic.steps.length - 1) { go(state.step + 1); return; }
    state.done = true;
    save();
    if (hooks.onFinish) hooks.onFinish();
  }
  function prev() {
    if (frame && frame.get() > 0) { frame.set(frame.get() - 1); return; }
    if (state.step === 0) return;
    const s = topic.steps[state.step - 1];
    if (s.type === "frame") state.sub[state.step - 1] = s.points.length - 1;
    go(state.step - 1);
  }
  function setNotes(text) { state.notes = String(text || "").slice(0, 20000); save(); }

  return { state, go, next, prev, setNotes, download, render };
}
