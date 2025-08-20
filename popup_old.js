// popup.js
const btn = document.getElementById("btnClickToggleUsers");

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
