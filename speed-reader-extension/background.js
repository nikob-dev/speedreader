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
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] })
    )
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`Speed Reader could not inject into tab ${tabs[i].id} (${tabs[i].url}):`, result.reason);
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'sr-speed-read-selection' || !tab || !tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    chrome.tabs.sendMessage(tab.id, { action: 'start', mode: 'selection' });
  } catch (e) {
    console.error('Speed Reader could not run on this page:', e);
  }
});
