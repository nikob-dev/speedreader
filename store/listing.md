# Chrome Web Store listing — copy/paste source

Paste these into the developer dashboard when creating the item.

## Store listing tab

**Name:** Speed Reader — RSVP

**Summary (≤132 chars):**
Speed read any page or selection one word at a time. Highlight text, double-tap Shift, and read at up to 900 words per minute.

**Category:** Productivity → Tools

**Description:**

Read faster without moving your eyes. Speed Reader shows text one word at a time at a fixed focal point (rapid serial visual presentation, or RSVP), with the pivot letter highlighted so your eye always lands in the same place.

- Highlight text and double-tap Shift to start instantly
- Or right-click a selection → Speed Read Selection, or use the toolbar button to read the whole article
- 150–900 words per minute; pauses slightly longer on punctuation and long words
- ← → skip back or forward about 2 seconds; Space to pause; Esc to close
- Click or drag the progress bar to jump anywhere
- Resizable reader: S / M / L / full window
- No account, no tracking, nothing leaves your browser

**Assets needed (create before submitting):**
- [ ] Icon 128×128 (have: `speed-reader-extension/icons/icon128.png`)
- [ ] At least 1 screenshot, 1280×800 (reader open over an article)
- [ ] Small promo tile, 440×280

## Privacy practices tab

**Single purpose:**
Display selected text or a page's main article one word at a time (RSVP) so the user can read it faster.

**Permission justifications:**

| Permission | Justification |
|---|---|
| `scripting` | Injects the reader overlay into the current tab when the user clicks the toolbar button or context-menu item, and into already-open tabs right after install so the shortcut works without reloading them. |
| `contextMenus` | Adds a "Speed Read Selection" item to the right-click menu when text is selected. |
| `storage` | Saves the user's reading speed and reader size preferences (`chrome.storage.sync`). |
| Host permission `<all_urls>` | The double-Shift shortcut must be available on any page the user reads. That requires a content script on all sites, because `activeTab` only grants access after an explicit click. The script only listens for the shortcut and reads text the user selected or asked to read; it sends nothing anywhere. |

**Remote code:** No, I am not using remote code.

**Data usage:** Collects none of the listed data types. Certify all three disclosures (not sold, not used for unrelated purposes, not used for creditworthiness).

**Privacy policy URL:** `https://github.com/nikob-dev/speedreader/blob/main/PRIVACY.md`

## Distribution tab

- Visibility **Public**, all regions.
