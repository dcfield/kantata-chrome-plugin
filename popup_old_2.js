// popup.js
const btn = document.getElementById("btnClickToggleUsers");
const selectCursor = document.getElementById("cursorToggle");

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

// Init dropdown to current state
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await chrome.runtime.sendMessage({ type: "GET_CURSOR_FIX_STATE" });
    selectCursor.value = res?.enabled ? "on" : "off";
  } catch (e) {
    console.error("Failed to fetch cursor state:", e?.message || e);
  }
});

// Update on change
selectCursor.addEventListener("change", async () => {
  const enabled = selectCursor.value === "on";
  try {
    await chrome.runtime.sendMessage({ type: "SET_CURSOR_FIX_STATE", enabled });
  } catch (e) {
    console.error("Failed to set cursor state:", e?.message || e);
  }
});
