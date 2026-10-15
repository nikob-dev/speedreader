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

- `npm run test:unit`: pure reading logic in `speed-reader-extension/reader-core.js` (tokenizing, pivot letter, word timing, skip math) and PDF text joining in `pdf-text.js`, using Node's built-in `node:test`.
- `npm run test:e2e`: Puppeteer loads the unpacked extension in headless Chrome against `tests/fixtures/article.html` and checks that:
  - double-Shift opens the reader;
  - double-Shift still works in an open tab after the extension reloads;
  - page mode loads the article text;
  - on a PDF (built in memory by `tests/fixtures/make-pdf.mjs`), page mode extracts its text, menu selections are read, the popup's selection button explains itself instead of reading the whole PDF, the Alt+Shift+R shortcut reads and plays the PDF, and reader keys work after focus was in the PDF viewer.
- CI (`.github/workflows/ci.yml`) runs both on every PR and on every push to `main`, then builds and checks the store zip.

Keep DOM-free logic in `reader-core.js` so it stays unit-testable. `content.js` reads it via `globalThis.SRCore`, and every script injection must list `reader-core.js` before `content.js`.

## PDF support

Chrome's PDF viewer is a sealed frame, so `content.js` asks `background.js` for the text. The background opens `offscreen.html`, which fetches the PDF and parses it with a vendored copy of PDF.js (`speed-reader-extension/vendor/pdfjs/`). To upgrade PDF.js, bump `PDFJS_VERSION` in `scripts/vendor-pdfjs.mjs`, run `node scripts/vendor-pdfjs.mjs`, and commit the result.

## Releasing (CI/CD)

```
PR ──────────────► ci.yml       unit + smoke tests, zip check (required to merge)
merge to main ───► publish.yml  tests → publish to the Public listing as <major>.<minor>.<run#>
                                → tag v<version> + GitHub Release with the zip
```

**Every merge to `main` ships to all users.** Each upload goes through Google's review (hours to days). After approval, Chrome auto-updates installed copies within a few hours. Manifest V3 forbids remotely hosted code, so there is no way to skip review.

**Versions:** CI takes `major.minor` from `manifest.json` and uses the run number as the patch (`1.4.0` → `1.4.57`). To start a new minor or major, change `version` in `manifest.json` to `1.5.0` in a PR. Tags are created by CI after a successful upload; pushing a tag by hand publishes nothing.

**Rollback:** revert the bad PR and merge. That ships the old code under a higher version. The store never accepts a lower version.

### One-time setup

1. Register a [Chrome Web Store developer account](https://chrome.google.com/webstore/devconsole) ($5, needs 2-step verification). Note your **publisher ID** (shown in the dashboard's account settings).
2. Run `npm run zip` and upload the zip by hand once as **Speed Reader — RSVP** (Public). The API can't create new items. Fill the listing from [`store/listing.md`](store/listing.md).
3. Create OAuth credentials (client ID, client secret, refresh token) by following the [chrome-webstore-upload-keys guide](https://github.com/fregante/chrome-webstore-upload-keys).
4. Add the repo secrets (Settings → Secrets and variables → Actions):
   - `CWS_CLIENT_ID`
   - `CWS_CLIENT_SECRET`
   - `CWS_REFRESH_TOKEN`
   - `CWS_PUBLISHER_ID`
   - `CWS_PUBLIC_ITEM_ID`
5. Require the `test` status check on `main` (Settings → Branches).

Until the secrets exist, `publish.yml` runs in **dry-run** mode: it tests, stamps the version and builds the zip, but skips the upload, tag and release.
