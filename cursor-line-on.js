// cursor-line-on.js
(() => {
    try {
      if (window.__ZW_cursorLineSetup) return; // idempotent
  
      const line = document.createElement("div");
      line.id = "zw-cursor-line";
      Object.assign(line.style, {
        position: "fixed",
        width: "2px",
        height: "500px",
        background: "#18b389",
        pointerEvents: "none",
        zIndex: "2147483647",
        left: "0px",
        top: "0px",
        display: "none",
        borderRadius: "1px"
      });
      document.documentElement.appendChild(line);
  
      const H = 24; // line height
      function isInPresentation(e) {
        return !!(e.target && e.target.closest && e.target.closest('[role="presentation"]'));
      }
  
      function onMove(e) {
        if (isInPresentation(e)) {
          line.style.display = "block";
          // center the 2px line on the cursor’s x, and vertically around y
          line.style.left = `${e.clientX - 1}px`;
          line.style.top = `${e.clientY - H / 2}px`;
        } else {
          line.style.display = "none";
        }
      }
  
      function onLeave() {
        line.style.display = "none";
      }
  
      window.addEventListener("mousemove", onMove, true);
      window.addEventListener("mouseout", onLeave, true);
  
      window.__ZW_cursorLineSetup = true;
      window.__ZW_cursorLineCleanup = () => {
        window.removeEventListener("mousemove", onMove, true);
        window.removeEventListener("mouseout", onLeave, true);
        line.remove();
        delete window.__ZW_cursorLineSetup;
        delete window.__ZW_cursorLineCleanup;
      };
    } catch (err) {
      console.error("cursor-line-on setup error:", err);
    }
  })();
  