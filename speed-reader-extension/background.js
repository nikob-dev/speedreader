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

// --- Attention tracking (webcam) ---
// The reader tab asks for tracking; the camera runs in an offscreen document
// owned by the extension, and this worker relays its states back to that tab.
const OFFSCREEN_URL = 'eye/offscreen.html';
const PERMISSION_URL = 'eye/camera-permission.html';

async function getReaderTabId() {
  const { readerTabId } = await chrome.storage.session.get('readerTabId');
  return readerTabId ?? null;
}

async function hasOffscreenDocument() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
  });
  return contexts.length > 0;
}

async function startAttention(tabId) {
  await chrome.storage.session.set({ readerTabId: tabId });
  if (await hasOffscreenDocument()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['USER_MEDIA'],
    justification: 'On-device webcam attention detection to pause the speed reader when the user looks away.'
  });
}

async function stopAttention() {
  await chrome.storage.session.remove('readerTabId');
  if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
}

async function relayToReader(message) {
  const tabId = await getReaderTabId();
  if (tabId === null) return;
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    console.warn('Speed Reader attention: reader tab unreachable, stopping camera', err);
    await stopAttention();
  }
}

async function handleAttentionError(message) {
  if (await hasOffscreenDocument()) await chrome.offscreen.closeDocument();
  if (message.name === 'NotAllowedError') {
    await relayToReader({ type: 'eye:status', status: 'needs-permission' });
    await chrome.tabs.create({ url: chrome.runtime.getURL(PERMISSION_URL) });
    return;
  }
  console.error('Speed Reader attention failed:', message.name, message.message);
  await relayToReader({ type: 'eye:status', status: 'error', detail: message.name });
}

async function handlePermissionGranted() {
  const tabId = await getReaderTabId();
  if (tabId === null) return;
  await chrome.tabs.update(tabId, { active: true });
  await startAttention(tabId);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message?.type?.startsWith('eye:')) return;
  const run = {
    'eye:start': () => startAttention(sender.tab.id),
    'eye:stop': () => stopAttention(),
    'eye:ready': () => relayToReader({ type: 'eye:status', status: 'ready' }),
    'eye:state': () => relayToReader(message),
    'eye:stats': () => relayToReader(message),
    'eye:error': () => handleAttentionError(message),
    'eye:permission-granted': () => handlePermissionGranted()
  }[message.type];
  if (!run) return;
  run().catch((err) => console.error(`Speed Reader attention: ${message.type} failed`, err));
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === (await getReaderTabId())) await stopAttention();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  if (changeInfo.status === 'loading' && tabId === (await getReaderTabId())) await stopAttention();
});
