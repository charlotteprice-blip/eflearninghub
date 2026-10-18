// Local preview server that behaves like firebase.json: trailing slashes, the viewer rewrites, and 404.html.
// Used by ./tasks preview. Pages open in preview mode (no sign in, sample content) because no emulators run.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = process.argv[2] || "public";
const port = Number(process.argv[3] || 5055);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (/^\/hub\/[a-z0-9-]+\/?$/.test(p) || /^\/library\/?$/.test(p)) p = "/index.html";
  let f = path.join(root, p);
  if (!path.resolve(f).startsWith(path.resolve(root))) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
    if (!p.endsWith("/")) { res.writeHead(301, { Location: p + "/" }); return res.end(); }
    f = path.join(f, "index.html");
  }
  if (!fs.existsSync(f)) { res.writeHead(404, { "Content-Type": types[".html"] }); return res.end(fs.readFileSync(path.join(root, "404.html"))); }
  res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
  res.end(fs.readFileSync(f));
}).listen(port, "127.0.0.1", () => console.log(`Preview: http://127.0.0.1:${port}/`));
