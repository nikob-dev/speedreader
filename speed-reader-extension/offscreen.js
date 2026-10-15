// Runs PDF.js in the extension's own origin: fetches get host permissions (no CORS),
// and the parser gets a real worker, which the service worker can't spawn.
import * as pdfjsLib from './vendor/pdfjs/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.min.mjs');

// fetch() refuses file: URLs; XHR still loads them once the user allows file access.
function loadBytes(url) {
  if (url.startsWith('file:')) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve(new Uint8Array(xhr.response));
      xhr.onerror = () => reject(new Error(`could not read ${url}`));
      xhr.send();
    });
  }
  return fetch(url, { credentials: 'include' }).then(async (res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching the PDF`);
    return new Uint8Array(await res.arrayBuffer());
  });
}

async function extractPdfText(url) {
  const data = await loadBytes(url);
  const loadingTask = pdfjsLib.getDocument({ data });
  try {
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      pages.push(content.items.filter((item) => 'str' in item));
      page.cleanup();
    }
    return globalThis.SRPdfText.joinPdfTextItems(pages);
  } finally {
    await loadingTask.destroy();
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen' || msg.action !== 'extractPdfText') return false;
  extractPdfText(msg.url).then(
    (text) => sendResponse({ text }),
    (err) => {
      console.error('Speed Reader PDF extraction failed:', msg.url, err);
      sendResponse({ error: err.message || String(err) });
    }
  );
  return true;
});
