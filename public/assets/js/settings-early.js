// Viewer settings apply before anything draws, so the page does not jump. A plain script (not a module) so it
// runs before the stylesheet paints. Kept in its own file because the Content Security Policy allows no inline scripts.
try {
  var s = JSON.parse(localStorage.getItem("ef-viewer-settings") || "{}");
  var c = document.documentElement.classList;
  if (s.weight === "regular") c.add("text-regular");
  if (s.size === "large") c.add("text-large");
  if (s.motion === "calm") c.add("calm-motion");
} catch (e) { /* storage unavailable: defaults apply */ }
