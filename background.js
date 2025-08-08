// background.js

// Handle popup command
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === "CLICK_TOGGLE_USERS") runClickAll();
  // return false (no async sendResponse)
});

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
