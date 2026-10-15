document.addEventListener('DOMContentLoaded', () => {
  const wpmSlider = document.getElementById('wpm');
  const wpmVal = document.getElementById('wpmVal');
  const status = document.getElementById('status');

  chrome.storage.sync.get({ wpm: 350 }, (data) => {
    wpmSlider.value = data.wpm;
    wpmVal.textContent = data.wpm;
  });

  wpmSlider.addEventListener('input', () => {
    const wpm = parseInt(wpmSlider.value, 10);
    wpmVal.textContent = wpm;
    chrome.storage.sync.set({ wpm });
  });

  const readSelection = document.getElementById('readSelection');
  document.getElementById('readPage').addEventListener('click', () => launch('page'));
  readSelection.addEventListener('click', () => launch('selection'));
  flagPdfTab();

  // ?tab=<id> lets the e2e tests open the popup as a page aimed at another tab;
  // the real popup has no query string and uses the active tab.
  async function targetTabId() {
    const forced = Number(new URLSearchParams(location.search).get('tab'));
    if (forced) return forced;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab?.id;
  }

  // The popup can't see a selection inside Chrome's PDF viewer, so say so here
  // instead of opening a reader with nothing to read.
  async function flagPdfTab() {
    const tabId = await targetTabId();
    if (!tabId) return;
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.contentType
      });
      if (result === 'application/pdf') {
        readSelection.disabled = true;
        document.getElementById('pdfHint').hidden = false;
      }
    } catch (e) {
      // Restricted pages (chrome://, the Web Store) refuse scripts; launch() reports those.
      console.warn('Speed Reader could not check whether this tab is a PDF:', e);
    }
  }

  async function launch(mode) {
    const tabId = await targetTabId();
    if (!tabId) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['reader-core.js', 'content.js']
      });
      chrome.tabs.sendMessage(tabId, { action: 'start', mode });
      window.close();
    } catch (e) {
      status.textContent = "Can't run on this page (browser settings or store pages are restricted).";
    }
  }
});
