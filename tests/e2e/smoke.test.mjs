import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const EXTENSION_DIR = fileURLToPath(new URL('../../speed-reader-extension', import.meta.url));
const FIXTURE = new URL('../fixtures/article.html', import.meta.url);
const READER_SELECTOR = '#sr-shadow-host';

let server;
let fixtureUrl;
let browser;
let extensionId;

before(async () => {
  const html = await readFile(FIXTURE);
  server = createServer((_req, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(html));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  fixtureUrl = `http://127.0.0.1:${server.address().port}/`;

  browser = await puppeteer.launch({ headless: true, pipe: true, enableExtensions: true });
  extensionId = await browser.installExtension(EXTENSION_DIR);
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function openFixture() {
  const page = await browser.newPage();
  await page.goto(fixtureUrl, { waitUntil: 'load' });
  return page;
}

async function closeReader(page) {
  await page.keyboard.press('Escape');
  await page.waitForSelector(READER_SELECTOR, { hidden: true, timeout: 3000 });
}

async function doubleShiftOnSelection(page) {
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('first'));
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.keyboard.press('Shift');
  await page.keyboard.press('Shift');
  await page.waitForSelector(READER_SELECTOR, { timeout: 3000 });
}

async function serviceWorker() {
  const target = await browser.waitForTarget(
    (t) => t.type() === 'service_worker' && t.url().startsWith(`chrome-extension://${extensionId}/`)
  );
  return target.worker();
}

test('double-Shift on a selection opens the reader', async () => {
  const page = await openFixture();
  await doubleShiftOnSelection(page);
  await closeReader(page);
  await page.close();
});

test('reader still opens in an already-open tab after the extension reloads', async () => {
  const page = await openFixture();
  await browser.installExtension(EXTENSION_DIR);
  // onInstalled re-injects into open tabs asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await doubleShiftOnSelection(page);
  await closeReader(page);
  await page.close();
});

test('injecting the scripts and sending start(page) reads the article', async () => {
  const page = await openFixture();
  await page.bringToFront();
  const worker = await serviceWorker();
  // Same injection path the popup and context menu use.
  await worker.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['reader-core.js', 'content.js'] });
    await chrome.tabs.sendMessage(tab.id, { action: 'start', mode: 'page' });
  }, fixtureUrl);
  await page.waitForSelector(READER_SELECTOR, { timeout: 3000 });
  const wordsLeft = await page.evaluate(
    (sel) => Number(document.querySelector(sel).shadowRoot.getElementById('srWordsLeft').textContent),
    READER_SELECTOR
  );
  assert.ok(wordsLeft > 50, `expected the article's words to be loaded, got ${wordsLeft}`);
  await page.close();
});
