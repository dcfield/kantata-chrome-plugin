// cursor-line-off.js
(() => {
  try {
    if (window.__ZW_cursorLineCleanup) window.__ZW_cursorLineCleanup();
  } catch (err) {
    console.error("cursor-line-off cleanup error:", err);
  }
})();
