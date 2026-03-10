import { getEnabled } from '../shared/storage';
import { SYNC_STATE, type SyncStatePayload } from '../shared/messages';
import { runTranslationOn } from './translate-runner';
import { startDomWatcher, stopDomWatcher } from './dom-watcher';

let enabled = false;

async function runOnce(): Promise<void> {
  const body = document.body;
  if (body) runTranslationOn(body);
}

async function init(): Promise<void> {
  enabled = await getEnabled();
  if (enabled) {
    await runOnce();
    startDomWatcher((node) => runTranslationOn(node));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

chrome.runtime.onMessage.addListener(
  (msg: { type: string } & SyncStatePayload, _sender, sendResponse) => {
    if (msg.type !== SYNC_STATE || typeof msg.enabled !== 'boolean') return;
    const next = msg.enabled;
    if (next === enabled) {
      sendResponse?.();
      return;
    }
    enabled = next;
    if (enabled) {
      runOnce().then(() => sendResponse?.());
      startDomWatcher((node) => runTranslationOn(node));
    } else {
      stopDomWatcher();
      sendResponse?.();
    }
    return true;
  }
);
