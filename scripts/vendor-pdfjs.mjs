// Copies a pinned PDF.js build into the extension. The Web Store bans remote code,
// so PDF.js ships inside the zip. Re-run after bumping PDFJS_VERSION and commit the result.
// Usage: node scripts/vendor-pdfjs.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PDFJS_VERSION = '6.3.289';
const DEST = fileURLToPath(new URL('../speed-reader-extension/vendor/pdfjs/', import.meta.url));
const FILES = ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs', 'LICENSE'];

const work = mkdtempSync(join(tmpdir(), 'pdfjs-'));
try {
  execFileSync('npm', ['pack', `pdfjs-dist@${PDFJS_VERSION}`, '--pack-destination', work], { stdio: 'inherit' });
  execFileSync('tar', ['-xzf', join(work, `pdfjs-dist-${PDFJS_VERSION}.tgz`), '-C', work]);
  rmSync(DEST, { recursive: true, force: true });
  mkdirSync(DEST, { recursive: true });
  for (const file of FILES) {
    copyFileSync(join(work, 'package', file), join(DEST, file.split('/').pop()));
  }
  writeFileSync(join(DEST, 'VERSION'), `pdfjs-dist ${PDFJS_VERSION}\n`);
  console.log(`vendored pdfjs-dist ${PDFJS_VERSION} into ${DEST}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
