// background.js

const CURSOR_KEY = "cursorFixEnabled";            // existing toggle
const CURSOR_LINE_KEY = "cursorLineEnabled";      // NEW toggle (default ON)
const FIXED_FEE_KEY = "fixedFeeEnabled";          // Fixed Fee Plugin toggle (default OFF)
const CURSOR_CSS_FILE = "cursor-fix.css";
const CURSOR_LINE_ON_FILE = "cursor-line-on.js";
const CURSOR_LINE_OFF_FILE = "cursor-line-off.js";
const FIXED_FEE_CSS_FILE = "fixed-fee-banner.css";
const FIXED_FEE_JS_FILE = "fixed-fee-banner.js";

// --- Helpers: get setting with default=true and persist if missing ---
function getEnabledDefaultTrue(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (res) => {
      const val = res?.[key];
      if (typeof val === "undefined") {
        chrome.storage.sync.set({ [key]: true }, () => resolve(true));
      } else {
        resolve(!!val);
      }
    });
  });
}

// --- Helper: get setting with default=false and persist if missing ---
function getEnabledDefaultFalse(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (res) => {
      const val = res?.[key];
      if (typeof val === "undefined") {
        chrome.storage.sync.set({ [key]: false }, () => resolve(false));
      } else {
        resolve(!!val);
      }
    });
  });
}

// Seed defaults on install/update (nice-to-have)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get([CURSOR_KEY, CURSOR_LINE_KEY, FIXED_FEE_KEY], (res) => {
    if (typeof res[CURSOR_KEY] === "undefined") chrome.storage.sync.set({ [CURSOR_KEY]: true });
    if (typeof res[CURSOR_LINE_KEY] === "undefined") chrome.storage.sync.set({ [CURSOR_LINE_KEY]: true });
    if (typeof res[FIXED_FEE_KEY] === "undefined") chrome.storage.sync.set({ [FIXED_FEE_KEY]: false });
  });
});

// ---- Messages from popup ----
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "CLICK_TOGGLE_USERS") {
    runClickAll().finally(() => sendResponse({ ok: true }));
    return true; // async
  }

  // existing cursor-fix state (dropdown)
  if (msg?.type === "GET_CURSOR_FIX_STATE") {
    getEnabledDefaultTrue(CURSOR_KEY).then((enabled) => sendResponse({ enabled }));
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

  // NEW: red line cursor feature (checkbox)
  if (msg?.type === "GET_CURSOR_LINE_STATE") {
    getEnabledDefaultTrue(CURSOR_LINE_KEY).then((enabled) => sendResponse({ enabled }));
    return true; // async
  }
  if (msg?.type === "SET_CURSOR_LINE_STATE") {
    const enabled = !!msg.enabled;
    chrome.storage.sync.set({ [CURSOR_LINE_KEY]: enabled }, async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && isResourcingUrl(tab.url)) {
          if (enabled) await insertCursorLine(tab.id);
          else await removeCursorLine(tab.id);
        }
      } catch (e) {
        console.error("Failed to toggle cursor line:", e?.message || e);
      } finally {
        sendResponse({ ok: true });
      }
    });
    return true; // async
  }

  // Fixed Fee Plugin state
  if (msg?.type === "GET_FIXED_FEE_STATE") {
    getEnabledDefaultFalse(FIXED_FEE_KEY).then((enabled) => sendResponse({ enabled }));
    return true; // async
  }
  if (msg?.type === "SET_FIXED_FEE_STATE") {
    const enabled = !!msg.enabled;
    chrome.storage.sync.set({ [FIXED_FEE_KEY]: enabled }, async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          if (enabled) await insertFixedFeeBanner(tab.id);
          else await removeFixedFeeBanner(tab.id);
        }
      } catch (e) {
        console.error("Failed to toggle fixed fee banner:", e?.message || e);
      } finally {
        sendResponse({ ok: true });
      }
    });
    return true; // async
  }
});

// ---- Auto-apply on page load/refresh ----
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  // Apply /resourcing features
  if (isResourcingUrl(tab?.url)) {
    getEnabledDefaultTrue(CURSOR_KEY).then((enabled) => {
      if (enabled) insertCursorCss(tabId).catch((e) => console.error("insert CSS:", e?.message || e));
    });

    getEnabledDefaultTrue(CURSOR_LINE_KEY).then((enabled) => {
      if (enabled) insertCursorLine(tabId).catch((e) => console.error("insert line:", e?.message || e));
    });
  }

  // Apply Fixed Fee Plugin (works on all pages)
  getEnabledDefaultFalse(FIXED_FEE_KEY).then((enabled) => {
    if (enabled) insertFixedFeeBanner(tabId).catch((e) => console.error("insert fixed fee:", e?.message || e));
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
  await chrome.scripting.insertCSS({ target: { tabId, allFrames: true }, files: [CURSOR_CSS_FILE] });
}

async function removeCursorCss(tabId) {
  if (!chrome.scripting?.removeCSS) throw new Error("scripting.removeCSS unavailable");
  await chrome.scripting.removeCSS({ target: { tabId, allFrames: true }, files: [CURSOR_CSS_FILE] });
}

async function insertCursorLine(tabId) {
  if (!chrome.scripting?.executeScript) throw new Error("scripting.executeScript unavailable");
  await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: [CURSOR_LINE_ON_FILE] });
}

async function removeCursorLine(tabId) {
  if (!chrome.scripting?.executeScript) throw new Error("scripting.executeScript unavailable");
  await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: [CURSOR_LINE_OFF_FILE] });
}

async function insertFixedFeeBanner(tabId) {
  if (!chrome.scripting?.insertCSS || !chrome.scripting?.executeScript) {
    throw new Error("scripting APIs unavailable");
  }
  await chrome.scripting.insertCSS({ target: { tabId }, files: [FIXED_FEE_CSS_FILE] });
  await chrome.scripting.executeScript({ target: { tabId }, files: [FIXED_FEE_JS_FILE] });
}

async function removeFixedFeeBanner(tabId) {
  if (!chrome.scripting?.removeCSS || !chrome.scripting?.executeScript) {
    throw new Error("scripting APIs unavailable");
  }
  await chrome.scripting.executeScript({ 
    target: { tabId }, 
    func: () => {
      if (window.kantataFixedFeeCleanup) {
        window.kantataFixedFeeCleanup();
      }
      const banner = document.getElementById('kantata-fixed-fee-banner');
      if (banner) banner.remove();
    }
  });
  await chrome.scripting.removeCSS({ target: { tabId }, files: [FIXED_FEE_CSS_FILE] });
}

// ======= Existing feature: Click all "Toggle User" buttons =======
async function runClickAll() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab found.");
    if (!chrome.scripting?.executeScript) {
      console.error("chrome.scripting API is unavailable. Reload the extension.");
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      world: "MAIN",
      func: clickAllToggleUserButtons
    });
    const totalFound = results?.reduce((sum, r) => sum + (r?.result?.found || 0), 0) || 0;
    const totalClicked = results?.reduce((sum, r) => sum + (r?.result?.clicked || 0), 0) || 0;
    if (totalFound === 0 || totalClicked === 0) {
      console.error("No buttons with aria-label='Toggle User' and title='Toggle User' found.");
    }
  } catch (err) {
    console.error("Error executing action on this page:", err?.message || err);
  }
}

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
    requestAnimationFrame(() => {
      for (const btn of buttons) {
        try { btn.click(); console.log("Button with aria-label='Toggle User' clicked."); }
        catch (clickErr) { console.error("Error clicking a 'Toggle User' button:", clickErr); }
      }
    });
    return { found: buttons.length, clicked: buttons.length };
  } catch (err) {
    console.error("Unexpected error while finding/clicking buttons:", err);
    return { found: 0, clicked: 0 };
  }
}
