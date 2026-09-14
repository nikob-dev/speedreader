chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sr-speed-read-selection',
    title: 'Speed Read Selection',
    contexts: ['selection']
  });
});

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
