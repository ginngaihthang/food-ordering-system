const STORAGE_KEY = 'takeaway_order_ids';
const MAX_STORED = 10;

export function rememberOrder(token: string): void {
  const updated = [token, ...getRememberedOrderTokens().filter((t) => t !== token)].slice(0, MAX_STORED);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getRememberedOrderTokens(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}


export function forgetOrder(token: string): void {
  const updated = getRememberedOrderTokens().filter((t) => t !== token);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}