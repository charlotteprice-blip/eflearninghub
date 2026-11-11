// Small helpers shared by the pages. No Firebase code here.

export const $ = id => document.getElementById(id);

// Shows one view of a page and hides the others; moves focus to the given element.
export function show(views, id, focusId) {
  views.forEach(v => { const el = $(v); if (el) el.hidden = v !== id; });
  const target = $(id);
  if (target) { target.classList.remove("step-enter"); void target.offsetWidth; target.classList.add("step-enter"); }
  const f = focusId && $(focusId);
  if (f) { if (!f.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(f.tagName)) f.setAttribute("tabindex", "-1"); f.focus(); }
}

// Field level errors: a short line under the field, linked for screen readers.
// A field may already be described by its hint (aria-describedby in the page), so an error is added to that list
// and taken off it again, never written over it.
function describedBy(el, id, on) {
  const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(x => x && x !== id);
  if (on) ids.push(id);
  if (ids.length) el.setAttribute("aria-describedby", ids.join(" ")); else el.removeAttribute("aria-describedby");
}
export function clearErrors(scope = document) {
  scope.querySelectorAll("[aria-invalid=true]").forEach(el => { el.removeAttribute("aria-invalid"); describedBy(el, "err-" + el.id, false); });
  scope.querySelectorAll(".field-err").forEach(el => el.remove());
}
export function fieldError(id, note, focus = true) {
  const el = $(id);
  if (!el) return;
  el.setAttribute("aria-invalid", "true");
  if (note) {
    const p = document.createElement("p");
    p.className = "field-err";
    p.id = "err-" + id;
    p.textContent = note;
    (el.closest(".field") || el.parentElement).appendChild(p);
    describedBy(el, p.id, true);
  }
  if (focus) el.focus();
}
// Typing in a marked field clears its error.
export function liveClear(form) {
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.getAttribute("aria-invalid") !== "true") return;
    t.removeAttribute("aria-invalid");
    describedBy(t, "err-" + t.id, false);
    const err = $("err-" + t.id);
    if (err) err.remove();
  });
}

// ---------- Status pills and notices (the same component and icons as the Client Hub) ----------
const escHtml = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// 16px stroked icons, drawn at the icon stroke token (.status svg and .notice-icon in the CSS). No colour is written
// here: each takes the colour of its pill or notice.
const ICON_16 = {
  success: '<circle cx="8" cy="8" r="6.25"/><path d="M5.1 8.3l2 2 3.8-4.2"/>',
  info: '<circle cx="8" cy="8" r="6.25"/><path d="M8 7.3v3.6M8 5.1v.01"/>',
  warning: '<path d="M8 2.3l6.2 10.9H1.8z"/><path d="M8 6.6v3M8 11.3v.01"/>',
  error: '<circle cx="8" cy="8" r="6.25"/><path d="M5.9 5.9l4.2 4.2M10.1 5.9l-4.2 4.2"/>',
  progress: '<circle cx="8" cy="8" r="6.25"/><path class="fill" d="M8 1.75a6.25 6.25 0 0 1 0 12.5z"/>'
};
export const icon16 = (name, cls = "") => `<svg viewBox="0 0 16 16"${cls ? ` class="${cls}"` : ""} aria-hidden="true">${ICON_16[name]}</svg>`;
// A status pill: an icon and a word on the tint of the status. Done is the pack's success colour, in progress its
// info colour, attention its warning colour. Anything else (Not started) is the plain neutral tag with no icon.
const STATUS_ICON = { done: "success", progress: "progress", attention: "warning" };
export const tag = label => `<span class="tag">${escHtml(label)}</span>`;
export const statusPill = (kind, label) => (STATUS_ICON[kind] ? `<span class="status status-${kind}">${icon16(STATUS_ICON[kind])}${escHtml(label)}</span>` : tag(label));
// A notice: 1 component for every message. An icon and a word on the tint of its kind, never colour alone.
// html is trusted markup written by the page, with any content already escaped.
export const NOTICE_WORD = { info: "Note", success: "Done", warning: "Attention", error: "Problem" };
export function notice(kind, html, { role = "", cls = "", id = "", word } = {}) {
  const k = NOTICE_WORD[kind] ? kind : "info";
  return `<div class="notice notice-${k}${cls ? ` ${cls}` : ""}"${id ? ` id="${id}"` : ""}${role ? ` role="${role}"` : ""}>${icon16(k, "notice-icon")}<div class="notice-body"><p class="notice-word">${escHtml(word || NOTICE_WORD[k])}</p>${html}</div></div>`;
}

export function say(id, text, ok = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("ok", !!ok);
}

export function busy(ids, on) {
  ids.forEach(id => { const b = $(id); if (b) b.disabled = on; });
}

// Dates in New Zealand time, written out: 18 October 2026.
export function nzDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
}

export const params = new URLSearchParams(location.search);

// Safe browser storage for per-viewer conveniences only (remembered step, chosen plan). Never for access.
export const store = {
  get(key, fallback = null) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch (e) { /* storage unavailable */ } }
};
export const session = {
  get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* storage unavailable */ } },
  remove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* storage unavailable */ } }
};

// Only same-site paths are accepted as a place to return to after signing in.
export function safeNext(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
