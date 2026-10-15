// Renders the Chrome Web Store screenshot: the reader paused mid-sentence over a demo article.
// Usage: npm run screenshots  →  store/screenshots/reader-1280x800.png
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const EXTENSION_DIR = fileURLToPath(new URL('../speed-reader-extension', import.meta.url));
const DEMO_PAGE = new URL('../store/screenshots/demo-article.html', import.meta.url);
const OUTPUT = fileURLToPath(new URL('../store/screenshots/reader-1280x800.png', import.meta.url));
const READER_SELECTOR = '#sr-shadow-host';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const html = await readFile(DEMO_PAGE);
const server = createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(html));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await puppeteer.launch({ headless: true, pipe: true, enableExtensions: true });
try {
  await browser.installExtension(EXTENSION_DIR);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'load' });

  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('first'));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
  });
  await page.keyboard.press('Shift');
  await page.keyboard.press('Shift');
  await page.waitForSelector(READER_SELECTOR, { timeout: 3000 });

  // Double-Shift autoplays after a short countdown. Wait for real playback, let a few words go by,
  // then pause so the shot shows a word with its highlighted pivot letter.
  await page.waitForFunction(
    (sel) => document.querySelector(sel).shadowRoot.getElementById('srPlay').textContent === 'Pause',
    { timeout: 3000 },
    READER_SELECTOR,
  );
  await sleep(1500);
  await page.keyboard.press('Space');
  await sleep(300);

  await page.screenshot({ path: OUTPUT });
  console.log(`wrote ${OUTPUT}`);
} finally {
  await browser.close();
  server.close();
}
