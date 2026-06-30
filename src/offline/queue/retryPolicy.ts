export type RetryPolicyConfig = {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

export function getBackoffDelayMs(retryCount: number, config = DEFAULT_RETRY_POLICY): number {
  const delay = config.baseDelayMs * 2 ** Math.max(0, retryCount - 1);
  return Math.min(delay, config.maxDelayMs);
}

export function shouldRetry(retryCount: number, config = DEFAULT_RETRY_POLICY): boolean {
  return retryCount < config.maxRetries;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
