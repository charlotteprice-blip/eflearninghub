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
export function clearErrors(scope = document) {
  scope.querySelectorAll("[aria-invalid=true]").forEach(el => { el.removeAttribute("aria-invalid"); el.removeAttribute("aria-describedby"); });
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
    el.setAttribute("aria-describedby", p.id);
  }
  if (focus) el.focus();
}
// Typing in a marked field clears its error.
export function liveClear(form) {
  form.addEventListener("input", e => {
    const t = e.target;
    if (t.getAttribute("aria-invalid") !== "true") return;
    t.removeAttribute("aria-invalid");
    t.removeAttribute("aria-describedby");
    const err = $("err-" + t.id);
    if (err) err.remove();
  });
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
