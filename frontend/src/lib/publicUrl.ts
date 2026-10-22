// The address customers' phones will open. Set VITE_PUBLIC_URL in frontend/.env
// to your real domain; otherwise the address of the page you're on is used.
export function getPublicBaseUrl(): string {
  const configured = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim();
  const base = configured || window.location.origin;
  return base.replace(/\/+$/, '');
}

export function getUrlWarning(url: string): string | null {
  let host : string;
  try {
    host = new URL(url).hostname;
  } catch {
    return 'This address looks invalid.';
  }

  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return "This address only works on this computer. Customers' phones can't open it. Set VITE_PUBLIC_URL to your real website address, or open this page from the live site, before you print.";
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
    return 'This address only works for phones on the same wifi network. Use your real website address before printing for customers.';
  }
  return null;
}