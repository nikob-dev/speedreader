# Speed Reader — RSVP

## Install (unpacked, developer mode)

1. Unzip this folder somewhere permanent (don't delete it after installing — Chrome loads the extension from this location).
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right toggle).
4. Click **Load unpacked** and select this folder.
5. Pin it: click the puzzle-piece icon in the toolbar, then the pin next to Speed Reader.

## Use

- **Fastest way:** highlight text on any page, then double-tap the **Shift** key. The reader opens immediately on your selection.
- Or select text, right-click → **Speed Read Selection**.
- Or click the toolbar icon → **Speed Read This Page** to read the page's main content.
- Inside the reader: Space to play/pause, ← → to adjust speed, Esc to close.

## About the permissions

This version asks for access to all sites, not just the current tab. That's because the double-Shift shortcut needs a script listening on every page all the time, which Chrome only allows with standing site access rather than the "only when you click the icon" permission the first version used. The script only acts on a Shift-Shift press or on the actions above; it's not sending data anywhere.

## Notes

- Any keypress between the two Shift taps cancels the gesture, so typing a capital letter (Shift+letter) never triggers it by accident.
- The shortcut only fires if there's an actual text selection — an idle double-tap does nothing.
- Article extraction (for "Speed Read This Page") is a simple heuristic (looks for `<article>`/`<main>`, falls back to the densest block of paragraphs). Works well on most blogs, news sites, and docs, but won't be perfect on every layout.
- Won't run on Chrome's internal pages (`chrome://...`) or the Chrome Web Store — that's a browser restriction on all extensions, not a bug.
