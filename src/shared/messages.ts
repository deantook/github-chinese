export const SYNC_STATE = 'SYNC_STATE';
export const REQUEST_STATE = 'REQUEST_STATE';

export interface SyncStatePayload {
  enabled: boolean;
}

export function broadcastEnabledState(enabled: boolean): void {
  chrome.runtime.sendMessage({ type: SYNC_STATE, enabled }).catch(() => {});
}
