import { getEnabled, setEnabled } from '../shared/storage';
import { SYNC_STATE, type SyncStatePayload } from '../shared/messages';

async function broadcastToGitHubTabs(payload: SyncStatePayload): Promise<void> {
  const tabs = await chrome.tabs.query({ url: '*://github.com/*' });
  for (const tab of tabs) {
    if (tab.id != null) {
      chrome.tabs.sendMessage(tab.id, { type: SYNC_STATE, ...payload }).catch(() => {});
    }
  }
}

chrome.runtime.onMessage.addListener(
  (
    msg: { type: string; enabled?: boolean },
    _sender,
    sendResponse: (response?: { enabled?: boolean }) => void
  ) => {
    if (msg.type === SYNC_STATE && typeof msg.enabled === 'boolean') {
      setEnabled(msg.enabled).then(() => {
        broadcastToGitHubTabs({ enabled: msg.enabled! });
        sendResponse();
      });
      return true;
    }
    if (msg.type === 'REQUEST_STATE') {
      getEnabled().then((enabled) => sendResponse({ enabled }));
      return true;
    }
    return false;
  }
);

getEnabled().then(() => {});
