export type NetworkState = {
  isOnline: boolean;
  lastOnlineAt: string | null;
  lastOfflineAt: string | null;
};

let cachedState: NetworkState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  lastOnlineAt: null,
  lastOfflineAt: null,
};

const listeners = new Set<(state: NetworkState) => void>();

function notify(): void {
  listeners.forEach((fn) => fn(cachedState));
}

export function getNetworkState(): NetworkState {
  return cachedState;
}

export function isBrowserOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function subscribeNetworkState(listener: (state: NetworkState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initNetworkService(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleOnline = () => {
    cachedState = {
      ...cachedState,
      isOnline: true,
      lastOnlineAt: new Date().toISOString(),
    };
    notify();
  };

  const handleOffline = () => {
    cachedState = {
      ...cachedState,
      isOnline: false,
      lastOfflineAt: new Date().toISOString(),
    };
    notify();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
