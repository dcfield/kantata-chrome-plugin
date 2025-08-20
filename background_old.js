// background.js

const CURSOR_KEY = "cursorFixEnabled";
const CURSOR_CSS_FILE = "cursor-fix.css";

// --- Helper: read setting with default=true and persist if missing ---
function getCursorFixEnabledDefaultTrue() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(CURSOR_KEY, (res) => {
      const val = res?.[CURSOR_KEY];
      if (typeof val === "undefined") {
        // Seed default ON and return true
        chrome.storage.sync.set({ [CURSOR_KEY]: true }, () => resolve(true));
      } else {
        resolve(!!val);
      }
    });
  });
}

// Keep this (nice-to-have) seeding on install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(CURSOR_KEY, (res) => {
    if (typeof res[CURSOR_KEY] === "undefined") {
      chrome.storage.sync.set({ [CURSOR_KEY]: true });
    }
  });
});

// ---- Messages from popup ----
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "CLICK_TOGGLE_USERS") {
    runClickAll().finally(() => sendResponse({ ok: true }));
    return true; // async
  }

  if (msg?.type === "GET_CURSOR_FIX_STATE") {
    getCursorFixEnabledDefaultTrue().then((enabled) => sendResponse({ enabled }));
    return true; // async
  }

  if (msg?.type === "SET_CURSOR_FIX_STATE") {
    const enabled = !!msg.enabled;
    chrome.storage.sync.set({ [CURSOR_KEY]: enabled }, async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && isResourcingUrl(tab.url)) {
          if (enabled) await insertCursorCss(tab.id);
          else await removeCursorCss(tab.id);
        }
      } catch (e) {
        console.error("Failed to toggle cursor CSS:", e?.message || e);
      } finally {
        sendResponse({ ok: true });
      }
    });
    return true; // async
  }
});

// ---- Auto-apply on navigation to /resourcing ----
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !isResourcingUrl(tab?.url)) return;

  // DEFAULT TRUE even if storage was empty
  getCursorFixEnabledDefaultTrue().then((enabled) => {
    if (enabled) {
      insertCursorCss(tabId).catch((e) =>
        console.error("Failed to insert cursor CSS:", e?.message || e)
      );
    }
  });
});

// ---- Helpers ----
function isResourcingUrl(url) {
  try {
    const u = new URL(url);
    return u.pathname.toLowerCase().includes("/resourcing");
  } catch {
    return false;
  }
}

async function insertCursorCss(tabId) {
  if (!chrome.scripting?.insertCSS) throw new Error("scripting.insertCSS unavailable");
  await chrome.scripting.insertCSS({
    target: { tabId, allFrames: true },
    files: [CURSOR_CSS_FILE]
  });
}

async function removeCursorCss(tabId) {
  if (!chrome.scripting?.removeCSS) throw new Error("scripting.removeCSS unavailable");
  await chrome.scripting.removeCSS({
    target: { tabId, allFrames: true },
    files: [CURSOR_CSS_FILE]
  });
}

// =================== FEATURE: CLICK_TOGGLE_USERS Click all "Toggle User" buttons ==============================

/**
 * Orchestrates script injection from the background worker.
 */
async function runClickAll() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");

    // Guard: if scripting API isn't available, fail gracefully instead of TypeError
    if (!chrome.scripting || typeof chrome.scripting.executeScript !== "function") {
      console.error("chrome.scripting API is unavailable. Reload the extension and ensure Chrome 88+ with Manifest V3.");
      return;
    }

    // Inject into all accessible frames
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: "MAIN",
      func: clickAllToggleUserButtons
    });

    const totalFound = results?.reduce((sum, r) => sum + (r?.result?.found || 0), 0) || 0;
    const totalClicked = results?.reduce((sum, r) => sum + (r?.result?.clicked || 0), 0) || 0;

    // If nothing was found anywhere, also emit the required error once from the extension side
    if (totalFound === 0 || totalClicked === 0) {
      console.error("No buttons with aria-label='Toggle User' and title='Toggle User' found.");
    }
  } catch (err) {
    console.error("Error executing action on this page:", err?.message || err);
  }
}

/**
 * Runs in the page context. Finds and clicks all matching buttons,
 * logging the required success/error messages to the page console.
 */
function clickAllToggleUserButtons() {
  try {
    const selector = 'button[aria-label="Toggle User"][title="Toggle User"]';
    const buttons = Array.from(document.querySelectorAll(selector));

    if (buttons.length === 0) {
      if (window.top === window) {
        console.error("No buttons with aria-label='Toggle User' and title='Toggle User' found.");
      }
      return { found: 0, clicked: 0 };
    }

    // Click all in the same frame tick (as simultaneously as possible)
    requestAnimationFrame(() => {
      for (const btn of buttons) {
        try {
          btn.click();
          console.log("Button with aria-label='Toggle User' clicked.");
        } catch (clickErr) {
          console.error("Error clicking a 'Toggle User' button:", clickErr);
        }
      }
    });

    return { found: buttons.length, clicked: buttons.length };
  } catch (err) {
    console.error("Unexpected error while finding/clicking buttons:", err);
    return { found: 0, clicked: 0 };
  }
}
