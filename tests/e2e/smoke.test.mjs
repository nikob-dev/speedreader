import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { makePdf } from '../fixtures/make-pdf.mjs';

const EXTENSION_DIR = fileURLToPath(new URL('../../speed-reader-extension', import.meta.url));
const FIXTURE = new URL('../fixtures/article.html', import.meta.url);
const READER_SELECTOR = '#sr-shadow-host';

let server;
let fixtureUrl;
let pdfUrl;

const PDF_PAGES = [
  [
    'Speed reading a PDF fixture. The quick brown fox jumps over the lazy dog again.',
    'This line ends with a hyphen-',
    'ated word that the extractor should rejoin before the reader shows it.'
  ],
  [
    'Page two continues with more ordinary words for the reader to display.',
    'Another sentence follows here so the total word count clears fifty easily.'
  ]
];
// What the reader should end up with: hyphen-ated rejoined, everything else one word per token.
const PDF_WORD_COUNT = PDF_PAGES.flat().join(' ').replace('hyphen- ated', 'hyphenated').split(/\s+/).length;
let browser;
let extensionId;

before(async () => {
  const html = await readFile(FIXTURE);
  const pdf = makePdf(PDF_PAGES);
  server = createServer((req, res) => {
    if (req.url === '/sample.pdf') res.writeHead(200, { 'content-type': 'application/pdf' }).end(pdf);
    else res.writeHead(200, { 'content-type': 'text/html' }).end(html);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  fixtureUrl = `http://127.0.0.1:${server.address().port}/`;
  pdfUrl = `${fixtureUrl}sample.pdf`;

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

async function startInTab(url, message) {
  const worker = await serviceWorker();
  await worker.evaluate(
    async (tabUrl, msg) => {
      const [tab] = await chrome.tabs.query({ url: tabUrl });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['reader-core.js', 'content.js'] });
      await chrome.tabs.sendMessage(tab.id, msg);
    },
    url,
    message
  );
}

async function wordsLeft(page) {
  return page.evaluate(
    (sel) => Number(document.querySelector(sel)?.shadowRoot.getElementById('srWordsLeft').textContent ?? -1),
    READER_SELECTOR
  );
}

async function openPdf() {
  const page = await browser.newPage();
  await page.goto(pdfUrl, { waitUntil: 'load' });
  await page.bringToFront();
  return page;
}

test('start(page) on a PDF extracts its text into the reader', async () => {
  const page = await openPdf();
  await startInTab(pdfUrl, { action: 'start', mode: 'page' });
  await page.waitForSelector(READER_SELECTOR, { timeout: 3000 });
  await page.waitForFunction(
    (sel, n) => document.querySelector(sel)?.shadowRoot.getElementById('srWordsLeft').textContent === String(n),
    { timeout: 10000 },
    READER_SELECTOR,
    PDF_WORD_COUNT
  );
  assert.equal(await wordsLeft(page), PDF_WORD_COUNT);
  await page.close();
});

test('the context-menu selection text is read on a PDF', async () => {
  const page = await openPdf();
  await startInTab(pdfUrl, { action: 'start', mode: 'selection', text: 'just these four words' });
  await page.waitForSelector(READER_SELECTOR, { timeout: 3000 });
  assert.equal(await wordsLeft(page), 4);
  await page.close();
});

test('reader keys work after focus was inside the PDF viewer', async () => {
  const page = await openPdf();
  // Put keyboard focus in Chrome's viewer frame, as a user scrolling the PDF would.
  await page.mouse.click(400, 300);
  await startInTab(pdfUrl, { action: 'start', mode: 'page' });
  await page.waitForSelector(READER_SELECTOR, { timeout: 3000 });
  await closeReader(page);
  await page.close();
});
