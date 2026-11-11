// Shared header and footer as two small custom elements, so every page has the same frame without a build step.
// <ef-header current="library"></ef-header>  current marks the active link (library, account).
// <ef-footer></ef-footer>
// The header shows the brand pack's horizontal lockup as supplied (an image, never live text), with the app's name
// beside it as plain interface text after a hairline.
// Loading states show the mark alone. It is read from /assets/brand/mark.svg (built by npm run tokens from the
// pack's loop and triangle paths) and inlined, so it can draw on: once, on the first page of a visit, over 1200ms,
// the loop tracing while the triangle fades in. After that, and with reduced motion, the finished mark is shown
// still. It never loops and never pulses.

import { session } from "./ui.js";

// The scope and crisis lines, written once here and shown on the dashboard, under every lesson and in the
// suitability check (Sarah's safeguards). The contact email was confirmed by Charlotte on 11 November 2026.
export const SUPPORT = {
  scope: "The Learning Hub is education, not therapy.",
  crisis: "If things are hard right now, call or text 1737 at any time, free, to talk with a trained counsellor. In an emergency, call 111.",
  contact: "consultant@sarahanticich.co.nz"
};
// The contact address as an email link, for the places it is shown as a way to get in touch.
export const contactLink = () => `<a href="mailto:${SUPPORT.contact}">${SUPPORT.contact}</a>`;

const MARK_URL = "/assets/brand/mark.svg";
let markText = null;
async function loadMark() {
  if (markText !== null) return markText;
  try {
    const res = await fetch(MARK_URL);
    markText = res.ok ? await res.text() : "";
  } catch (e) { markText = ""; }
  return markText;
}

// Puts the mark into a host element (a loading state); draws it on the first time in this visit.
export async function placeMark(host, { draw = true } = {}) {
  const svg = await loadMark();
  if (!svg) return;
  host.innerHTML = svg.replace(/<!--[\s\S]*?-->/g, "");
  const el = host.querySelector("svg");
  if (el) { el.setAttribute("aria-hidden", "true"); el.removeAttribute("role"); el.removeAttribute("aria-label"); }
  if (draw && !session.get("ef-mark-drawn")) {
    host.classList.add("draw");
    session.set("ef-mark-drawn", "1");
  }
}

class EfHeader extends HTMLElement {
  connectedCallback() {
    const current = this.getAttribute("current") || "";
    this.innerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="site-header">
        <div class="wrap">
          <a class="brand" href="/" aria-label="Executive Frame Learning Hub, home">
            <img class="brand-lockup" src="/assets/brand/ef-lockup-slate.svg" alt="Executive Frame" width="150" height="24">
            <img class="brand-mark-only" src="/assets/brand/ef-mark-slate.svg" alt="Executive Frame" width="28" height="28">
            <span class="brand-app">Learning Hub</span>
          </a>
          <nav class="site-nav" aria-label="Main">
            <span data-nav-member hidden>
              <a href="/">Learning Hub</a>
              <a class="nav-optional" href="/account/" ${current === "account" ? 'aria-current="page"' : ""}>Account</a>
              <button type="button" data-logout>Log out</button>
            </span>
            <span data-nav-guest hidden>
              <a href="/login/" ${current === "login" ? 'aria-current="page"' : ""}>Log in</a>
            </span>
          </nav>
        </div>
      </header>`;
    if (this.hasAttribute("bare")) return;
    import("./app.js").then(({ onUser, logOut }) => {
      onUser(user => {
        this.querySelector("[data-nav-member]").hidden = !user;
        this.querySelector("[data-nav-guest]").hidden = !!user;
      });
      this.querySelector("[data-logout]").addEventListener("click", async () => {
        await logOut();
        location.assign("/login/?signedout=1");
      });
    }).catch(() => {
      this.querySelector("[data-nav-guest]").hidden = false;
    });
  }
}

class EfFooter extends HTMLElement {
  connectedCallback() {
    const year = new Date().getFullYear();
    this.innerHTML = `
      <footer class="site-footer t-caption">
        <div class="wrap">
          <p>&copy; ${year} Executive Frame</p>
          <nav aria-label="Footer">
            <a href="/privacy/">Privacy statement</a>
            <a href="https://executiveframe.co.nz/">executiveframe.co.nz</a>
          </nav>
        </div>
      </footer>`;
  }
}

customElements.define("ef-header", EfHeader);
customElements.define("ef-footer", EfFooter);
