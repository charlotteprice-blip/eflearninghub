// Library: the topic hubs the member can open, from /content/topics.json.
// Members only (gate.js). Progress labels come from this browser's saved place in each topic.
import { requireMember } from "./gate.js";
import { $, show, store, params, nzDate } from "./ui.js";
import { placeMark } from "./layout.js";

const VIEWS = ["v-loading", "v-library", "v-error"];
placeMark(document.querySelector("[data-loading-mark]"), { draw: false });
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let access;
try {
  ({ access } = await requireMember());
} catch (err) {
  console.warn("Membership check failed", err && err.code);
  show(VIEWS, "v-error", "error-title");
  throw err;
}

if (access.state === "trialing" && access.trialEnd) {
  $("library-note").textContent = `Your free trial runs until ${nzDate(access.trialEnd)}. Choose a topic to begin; your place in each one is kept on this device.`;
}

const index = await fetch("/content/topics.json", { cache: "no-cache" }).then(r => r.json());
const visible = index.topics.filter(t => t.status !== "draft").filter(t => {
  const arms = Array.isArray(t.arms) && t.arms.length ? t.arms : ["all"];
  return arms.includes("all") || !access.arms || access.arms === "all" || arms.some(a => access.arms.includes(a));
});

function progress(t) {
  const p = store.get(`ef-hub-${t.slug}`);
  if (!p) return "Not started";
  if (p.done) return "Finished";
  return typeof p.step === "number" ? `In progress, step ${p.step + 1}` : "Not started";
}

$("topics").innerHTML = visible.map(t => `
  <li>
    <a class="topic-card" href="/hub/${encodeURIComponent(t.slug)}/">
      <h2 class="t-heading">${esc(t.title)}</h2>
      <p>${esc(t.summary)}</p>
      <span class="topic-meta">
        <span class="tag">${esc(progress(t))}</span>
        ${t.minutes ? `<span class="t-caption">${esc(t.minutes)} minutes</span>` : ""}
      </span>
    </a>
  </li>`).join("");
$("empty").hidden = visible.length > 0;

const finished = params.get("finished");
const done = finished && index.topics.find(t => t.slug === finished);
if (done) {
  $("finished-note").textContent = `You have finished ${done.title}. You can open it again at any time.`;
  $("finished-note").hidden = false;
}

show(VIEWS, "v-library", done ? "finished-note" : null);
