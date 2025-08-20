# Kantata Chrome Plugin Features

## Feature: Red Vertical Cursor Line

**Trigger:** Popup checkbox (default: enabled)  
**Scope:** `/resourcing` pages only (case-insensitive URL matching)  
**Target Selector:** `div[role="presentation"]`  

**Behavior:**
- Shows a 2px orange vertical line centered on cursor (24px tall)
- Only appears when hovering inside elements with `role="presentation"`
- Line follows cursor movement and disappears when leaving target elements
- Auto-applies on page load/refresh for `/resourcing` URLs

**Implementation Notes:**
- Uses chrome.scripting.executeScript to inject cursor-line-on.js/cursor-line-off.js
- State persisted via chrome.storage.sync
- Idempotent setup prevents duplicate listeners
- Proper cleanup when disabled

**Files:**
- cursor-line-on.js: Creates orange line element and mouse event handlers
- cursor-line-off.js: Removes line and cleans up event handlers

