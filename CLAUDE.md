# Rules of engagement
- Always give me a plan before making change so I can verify it.
- Make sure you are on a feature branch before making changes.
- Always update the feature document after the code changes. If no feature document exists, create a new one under "feature_designs" folder.

# Shortcuts
- If I type any of the following, translate it to the associated command:
  - cpp: Commit the code, push it to a feature branch and create a pull request for me to review. Always give a detailed commit message

# Kantata Chrome Plugin

This repository contains a Chrome Manifest V3 extension with a popup menu and background service worker. The extension provides one global action and two /resourcing-scoped features.

# Overview
- Architecture:
    - Background service worker (background.js)
    - Popup (popup.html + popup.js)
    - CSS/JS injected dynamically (no static content_scripts)

- Key UX rules:
    - No on-page UI beyond the required features
    - All user feedback happens in the console logs
    - Popup must remain simple and minimal

- Scope:
  - Features 2 & 3 only apply when the tab URL includes /resourcing (case-insensitive)

- Defaults:
    - Both /resourcing features are enabled by default (persisted via chrome.storage.sync)

- Permissions:
    - "scripting", "activeTab", "tabs", "storage" only
    - Do not expand permissions without documenting rationale

# Features
1. Click All “Toggle User” Buttons
Trigger: Popup button
Selector: button[aria-label="Toggle User"][title="Toggle User"]
Behavior: Clicks all matching buttons at once, across all frames
Logs:
- Success (per click): Button with aria-label='Toggle User' clicked.
- If none found: No buttons with aria-label='Toggle User' and title='Toggle User' found.

2. Disable Hand Cursor on /resourcing
- Popup control: Dropdown (“On/Off”, default = On)
- Implementation: Injects or removes cursor-fix.css
- Effect: Forces standard cursor (cursor: default !important)

3. Red Vertical Cursor Line in div[role="presentation"]
Popup control: Checkbox (default = checked)
- Implementation:
    - Injects cursor-line-on.js to attach behavior
    - Injects cursor-line-off.js to detach behavior
    - Effect: Shows a 2px red vertical line centered on the cursor (24px tall) when hovering inside div[role="presentation"]. Cleans up when disabled.
    - Repository Layout

4. Project Estimate Calculator
- See file 01_project-overview-estimate-calculator