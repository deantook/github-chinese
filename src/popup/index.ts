import { getEnabled, setEnabled } from '../shared/storage';
import { SYNC_STATE } from '../shared/messages';

const toggle = document.getElementById('toggle') as HTMLInputElement;
const versionEl = document.getElementById('version');

if (versionEl) {
  const v = chrome.runtime.getManifest().version;
  versionEl.textContent = `v${v}`;
}

getEnabled().then((enabled) => {
  if (toggle) toggle.checked = enabled;
});

toggle?.addEventListener('change', async () => {
  const enabled = toggle.checked;
  await setEnabled(enabled);
  chrome.runtime.sendMessage({ type: SYNC_STATE, enabled }).catch(() => {});
});
