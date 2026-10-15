# Speed Reader

Chrome extension (MV3) for RSVP speed reading. The extension itself lives in [`speed-reader-extension/`](speed-reader-extension/README.md); this root holds dev tooling only.

## Development

Requires Node 22+.

```sh
npm install
npm run dev   # launches Chrome (temp profile) with the extension; auto-reloads on file save
npm run zip   # builds dist/speed-reader-<version>.zip for Chrome Web Store upload
```

- `npm run dev` uses [`web-ext`](https://github.com/mozilla/web-ext) with the Chromium target. Each save reloads the extension; `background.js` re-injects `content.js` into open tabs, so double-Shift keeps working without refreshing pages.
- The dev Chrome uses a throwaway profile, so `chrome.storage.sync` settings reset each run. To keep them, append `-- --chromium-profile <dir>`.
- Popups and the service worker reload too; an open popup must be closed and reopened.
