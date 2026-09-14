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

  document.getElementById('readPage').addEventListener('click', () => launch('page'));
  document.getElementById('readSelection').addEventListener('click', () => launch('selection'));

  async function launch(mode) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      chrome.tabs.sendMessage(tab.id, { action: 'start', mode });
      window.close();
    } catch (e) {
      status.textContent = "Can't run on this page (browser settings or store pages are restricted).";
    }
  }
});
