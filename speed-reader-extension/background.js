chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'sr-speed-read-selection',
    title: 'Speed Read Selection',
    contexts: ['selection']
  });
  await injectIntoOpenTabs();
});

// Manifest content scripts only reach pages loaded after install/update/reload,
// so tabs already open would have no double-Shift listener until refreshed.
async function injectIntoOpenTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*', 'file:///*'] });
  const results = await Promise.allSettled(
    tabs.map((tab) =>
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['reader-core.js', 'content.js'] })
    )
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`Speed Reader could not inject into tab ${tabs[i].id} (${tabs[i].url}):`, result.reason);
    }
  });
}

async function startInTab(tabId, message) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['reader-core.js', 'content.js'] });
    await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    console.error('Speed Reader could not run on this page:', e);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'sr-speed-read-selection' || !tab || !tab.id) return;
  // Chrome's PDF viewer hides its selection from the page, but the menu still reports it.
  startInTab(tab.id, { action: 'start', mode: 'selection', text: info.selectionText });
});

// Chrome handles command shortcuts above the page, so this one also fires inside the
// PDF viewer, where double-Shift never reaches the content script.
chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== 'speed-read' || !tab || !tab.id) return;
  startInTab(tab.id, { action: 'start', mode: 'shortcut', autoplay: true });
});

const OFFSCREEN_URL = 'offscreen.html';
let offscreenCreating = null;
let pdfJobs = 0;

async function ensureOffscreen() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
  });
  if (existing.length) return;
  // Two PDFs requested at once must not both try to create the single allowed document.
  offscreenCreating ??= chrome.offscreen
    .createDocument({
      url: OFFSCREEN_URL,
      reasons: ['WORKERS'],
      justification: 'Run PDF.js in a worker to extract text from PDFs for speed reading.'
    })
    .finally(() => {
      offscreenCreating = null;
    });
  await offscreenCreating;
}

async function extractPdf(url) {
  if (url.startsWith('file:') && !(await chrome.extension.isAllowedFileSchemeAccess())) {
    return { error: 'To read local PDFs, turn on "Allow access to file URLs" for Speed Reader in chrome://extensions.' };
  }
  pdfJobs++;
  try {
    await ensureOffscreen();
    return await chrome.runtime.sendMessage({ target: 'offscreen', action: 'extractPdfText', url });
  } finally {
    // PDF.js holds onto a lot of memory, so drop the document once nothing is in flight.
    if (--pdfJobs === 0) {
      await chrome.offscreen.closeDocument().catch((e) => console.warn('Speed Reader could not close offscreen document:', e));
    }
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action !== 'extractPdf' || !sender.tab) return false;
  extractPdf(msg.url).then(sendResponse, (err) => {
    console.error('Speed Reader PDF extraction failed:', msg.url, err);
    sendResponse({ error: err.message || String(err) });
  });
  return true;
});
