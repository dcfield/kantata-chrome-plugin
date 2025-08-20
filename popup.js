// popup.js
const btn = document.getElementById("btnClickToggleUsers");
const cursorToggleCheckbox = document.getElementById("cursorToggle");
const cursorLineCheckbox = document.getElementById("cursorLineCheckbox");

// Click-all feature
btn.addEventListener("click", async () => {
  const label = btn.textContent;
  try {
    btn.disabled = true;
    btn.textContent = "Running…";
    await chrome.runtime.sendMessage({ type: "CLICK_TOGGLE_USERS" });
  } catch (err) {
    console.error("Error sending message to background:", err?.message || err);
  } finally {
    btn.textContent = label;
    btn.disabled = false;
    window.close();
  }
});

// Init controls to current state
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res1 = await chrome.runtime.sendMessage({ type: "GET_CURSOR_FIX_STATE" });
    cursorToggleCheckbox.checked = !!res1?.enabled;
  } catch (e) {
    console.error("Failed to fetch cursor-fix state:", e?.message || e);
  }

  try {
    const res2 = await chrome.runtime.sendMessage({ type: "GET_CURSOR_LINE_STATE" });
    cursorLineCheckbox.checked = !!res2?.enabled; // default ON comes from background
  } catch (e) {
    console.error("Failed to fetch cursor-line state:", e?.message || e);
  }
});

// Update on change (cursor-fix checkbox)
cursorToggleCheckbox.addEventListener("change", async () => {
  const enabled = cursorToggleCheckbox.checked;
  try {
    await chrome.runtime.sendMessage({ type: "SET_CURSOR_FIX_STATE", enabled });
  } catch (e) {
    console.error("Failed to set cursor-fix state:", e?.message || e);
  }
});

// Update on change (red line checkbox)
cursorLineCheckbox.addEventListener("change", async () => {
  const enabled = cursorLineCheckbox.checked;
  try {
    await chrome.runtime.sendMessage({ type: "SET_CURSOR_LINE_STATE", enabled });
  } catch (e) {
    console.error("Failed to set cursor-line state:", e?.message || e);
  }
});
