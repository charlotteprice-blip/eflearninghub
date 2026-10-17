// Shared header and footer as two small custom elements, so every page has the same frame without a build step.
// <ef-header current="library"></ef-header>  current marks the active link (library, account).
// <ef-footer></ef-footer>
// The mark is read from /assets/brand/mark.svg and inlined, so the supplied file can replace the placeholder
// and still draw on (1200ms, first page of each visit only, never with reduced motion).

import { session } from "./ui.js";

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

// Puts the mark into a host element; draws it on the first time in this visit.
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
            <span class="brand-mark" data-mark></span>
            <span class="brand-name">Executive Frame <span>Learning Hub</span></span>
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
    placeMark(this.querySelector("[data-mark]"));
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
