export type OfflineEventType =
  | 'queueChanged'
  | 'syncStarted'
  | 'syncProgress'
  | 'syncCompleted'
  | 'syncFailed'
  | 'entityChanged'
  | 'online'
  | 'offline';

export type OfflineEventDetail = {
  entity?: string;
  localId?: string;
  synced?: number;
  failed?: number;
  error?: string;
  current?: number;
  total?: number;
};

const EVENT_PREFIX = 'offline:';

export function emitOfflineEvent(type: OfflineEventType, detail?: OfflineEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(`${EVENT_PREFIX}${type}`, { detail }));
}

export function subscribeOfflineEvent(
  type: OfflineEventType,
  handler: (detail?: OfflineEventDetail) => void,
): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    handler((event as CustomEvent<OfflineEventDetail>).detail);
  };

  window.addEventListener(`${EVENT_PREFIX}${type}`, listener);
  return () => window.removeEventListener(`${EVENT_PREFIX}${type}`, listener);
}
