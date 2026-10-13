# Speed Reader

Chrome extension (MV3) for RSVP speed reading. The extension itself lives in [`speed-reader-extension/`](speed-reader-extension/README.md); this root holds dev tooling only.

## Development

Requires Node 22+.

```sh
npm install
npm run dev   # launches Chrome (temp profile) with the extension; auto-reloads on file save
npm run zip   # builds dist/speed-reader-<version>.zip for Chrome Web Store upload
npm test      # unit tests + headless-Chrome smoke tests
```

- `npm run dev` uses [`web-ext`](https://github.com/mozilla/web-ext) with the Chromium target. Each save reloads the extension; `background.js` re-injects `content.js` into open tabs, so double-Shift keeps working without refreshing pages.
- The dev Chrome uses a throwaway profile, so `chrome.storage.sync` settings reset each run. To keep them, append `-- --chromium-profile <dir>`.
- Popups and the service worker reload too; an open popup must be closed and reopened.

## Testing

- `npm run test:unit`: pure reading logic in `speed-reader-extension/reader-core.js` (tokenizing, pivot letter, word timing, skip math), using Node's built-in `node:test`.
- `npm run test:e2e`: Puppeteer loads the unpacked extension in headless Chrome against `tests/fixtures/article.html` and checks that:
  - double-Shift opens the reader;
  - double-Shift still works in an open tab after the extension reloads;
  - page mode loads the article text.
- CI (`.github/workflows/ci.yml`) runs both on every PR and on every push to `main`, then builds and checks the store zip.

Keep DOM-free logic in `reader-core.js` so it stays unit-testable. `content.js` reads it via `globalThis.SRCore`, and every script injection must list `reader-core.js` before `content.js`.
