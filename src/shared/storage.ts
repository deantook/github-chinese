const STORAGE_KEY = 'github-chinese-enabled';

export async function getEnabled(): Promise<boolean> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  if (result[STORAGE_KEY] === undefined) return true;
  return Boolean(result[STORAGE_KEY]);
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: enabled });
}
